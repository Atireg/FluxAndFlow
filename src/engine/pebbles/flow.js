import * as THREE from 'three';
import { CUBE_SIZE, PEBBLE_RADIUS } from '../constants.js';

/**
 * The flow: the cursor (or a finger) moving through the grid carries the
 * pebbles near it along, like a hand drawn through water. They lean the way
 * they're carried and drift back on a soft, slightly bouncy spring once it
 * passes.
 *
 * Unlike the rest of the catalog's motion this has memory - a spring
 * integrated frame by frame - since a push has to linger after the pointer
 * moves on. Integrated in fixed small steps, so it behaves the same at 5 fps
 * as at 120. It's added on top of whatever mode a pebble is in, only in the
 * catalog, and zeroed whenever the catalog is left, so it never carries a
 * stale shove into the drop or back out of a project.
 *
 * Only motion pushes: a resting cursor exerts nothing, so the pebble under
 * it stays put to be clicked.
 *
 * Pebbles also push each other: where two touch, each is shoved away from
 * the other on the same spring (bumpPebbles), so one carried by the pointer,
 * drifting, or swelling in the spotlight's jump nudges its neighbours along.
 */
const FLOW_RADIUS = CUBE_SIZE * 1.4; // units - how far from the pointer pebbles feel it
const FLOW_CARRY = 0.07; // seconds of pointer travel a pebble right under it is carried
const FLOW_MAX = 2.2; // units - the furthest a pebble is carried
const FLOW_STIFFNESS = 28; // 1/s² - pull back towards home
const FLOW_DAMPING = 5.5; // 1/s - under-damped, so a pebble overshoots a touch and settles
const FLOW_TILT = 0.06; // radians of lean per unit/second of the pebble's own speed
const FLOW_TILT_MAX = 0.35; // radians
const FLOW_POINTER_FADE = 0.12; // seconds for the pointer's speed to die away once it stops
const FLOW_STEP = 1 / 120; // seconds per integration step

// Pebbles that touch push each other apart, on the same springs
const BUMP_STIFFNESS = 140; // 1/s² per unit of overlap - 40 let them sink into each other; asked to repel more
const BUMP_REACH = 1.05; // a pebble's reach, as a share of its radius - they push just before their glass touches

// Its scale too, so the spotlight's pulse shoves its neighbours
function bumpRadius(pebble) {
    return PEBBLE_RADIUS * pebble.userData.size * pebble.scale.x * BUMP_REACH;
}

export function createFlow(pebbles) {
    const pointer = new THREE.Vector3();
    const pointerVelocity = new THREE.Vector2();
    let pointerKnown = false;
    let pointerAt = 0;

    // Where the pointer's motion would carry this pebble right now
    function flowTarget(pebble) {
        const home = pebble.userData.slotPosition;
        const target = { x: 0, z: 0 };
        if (!pointerKnown || !home) return target;

        const distance = Math.hypot(home.x - pointer.x, home.z - pointer.z);
        const reach = Math.exp(-((distance / FLOW_RADIUS) ** 2));
        target.x = pointerVelocity.x * FLOW_CARRY * reach;
        target.z = pointerVelocity.y * FLOW_CARRY * reach;

        const length = Math.hypot(target.x, target.z);
        if (length > FLOW_MAX) {
            target.x *= FLOW_MAX / length;
            target.z *= FLOW_MAX / length;
        }
        return target;
    }

    /**
     * Two pebbles that touch, seen from above (as the camera sees them), push
     * apart in proportion to how far they overlap - the bigger one, heavier,
     * giving way less. Soft: against the pull home they part only partly, so
     * big neighbours still overlap a little. Read from where each pebble is
     * this frame (pebble.position, before the flow is added) plus its flow.
     */
    function bumpPebbles() {
        for (let i = 0; i < pebbles.length; i++) {
            const a = pebbles[i];
            for (let j = i + 1; j < pebbles.length; j++) {
                const b = pebbles[j];
                const dx = a.position.x + a.userData.flow.x - b.position.x - b.userData.flow.x;
                const dz = a.position.z + a.userData.flow.z - b.position.z - b.userData.flow.z;
                const distance = Math.hypot(dx, dz);
                const reach = bumpRadius(a) + bumpRadius(b);
                if (distance >= reach || distance === 0) continue;

                const push = BUMP_STIFFNESS * (reach - distance) / distance;
                const massA = a.userData.size ** 2;
                const massB = b.userData.size ** 2;
                a.userData.flow.ax += push * dx / massA;
                a.userData.flow.az += push * dz / massA;
                b.userData.flow.ax -= push * dx / massB;
                b.userData.flow.az -= push * dz / massB;
            }
        }
    }

    return {
        /**
         * Where the pointer is on the pebbles' plane. `hit` comes from the
         * engine's own raycast, so the flow and the streams read one pointer.
         */
        track(hit) {
            const now = performance.now() / 1000;

            if (pointerKnown) {
                const dt = Math.max(now - pointerAt, 1 / 240);
                const vx = (hit.x - pointer.x) / dt;
                const vz = (hit.z - pointer.z) / dt;

                // Smoothed, since pointer events arrive unevenly
                pointerVelocity.x += (vx - pointerVelocity.x) * 0.5;
                pointerVelocity.y += (vz - pointerVelocity.y) * 0.5;
            }

            pointer.copy(hit);
            pointerAt = now;
            pointerKnown = true;
        },

        reset() {
            pointerVelocity.set(0, 0);
            pointerKnown = false;
            pebbles.forEach((pebble) => {
                pebble.userData.flow = { x: 0, z: 0, vx: 0, vz: 0 };
            });
        },

        update(dt) {
            // The pointer's push dies away once it stops moving
            pointerVelocity.multiplyScalar(Math.exp(-dt / FLOW_POINTER_FADE));

            pebbles.forEach((pebble) => {
                pebble.userData.flow ??= { x: 0, z: 0, vx: 0, vz: 0 };
                pebble.userData.flow.target = flowTarget(pebble);
            });

            // Damped springs towards those, and the bumps, integrated in small steps
            const steps = Math.ceil(dt / FLOW_STEP);
            const h = dt / steps;
            for (let i = 0; i < steps; i++) {
                pebbles.forEach((pebble) => {
                    const flow = pebble.userData.flow;
                    flow.ax = FLOW_STIFFNESS * (flow.target.x - flow.x) - FLOW_DAMPING * flow.vx;
                    flow.az = FLOW_STIFFNESS * (flow.target.z - flow.z) - FLOW_DAMPING * flow.vz;
                });
                bumpPebbles();
                pebbles.forEach((pebble) => {
                    const flow = pebble.userData.flow;
                    flow.vx += flow.ax * h;
                    flow.vz += flow.az * h;
                    flow.x += flow.vx * h;
                    flow.z += flow.vz * h;
                });
            }
        },

        // On top of whatever the pebble's mode has just set
        apply(pebble) {
            const flow = pebble.userData.flow;
            if (!flow) return;

            pebble.position.x += flow.x;
            pebble.position.z += flow.z;

            // Leaning into the direction it's being carried. Down the screen
            // is +Z, and a positive turn about X tips the top of the pebble
            // that way.
            const lean = (value) => THREE.MathUtils.clamp(value * FLOW_TILT, -FLOW_TILT_MAX, FLOW_TILT_MAX);
            pebble.rotation.x += lean(flow.vz);
            pebble.rotation.z -= lean(flow.vx);
        },
    };
}
