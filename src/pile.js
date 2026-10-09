import * as THREE from 'three';

/**
 * A pile: several copies of one crossed-rod aggregate dropped onto a
 * surface with real physics, so they tumble, hook into one another and
 * settle - differently every time the project opens. Emergent Space uses
 * it (a project's `drop`). See DECISIONS.md, "Emergent Space: aggregates
 * dropped with live physics".
 *
 * The physics engine (cannon-es) is only downloaded the first time a pile
 * is built, so the catalog and every other project never load it.
 */
let physicsModule = null;

export function loadPhysics() {
    physicsModule ??= import('cannon-es');
    return physicsModule;
}

const PILE_GRAVITY = 9.82; // m/s^2 - the aggregate is taken as PILE_REAL_SIZE across
const PILE_REAL_SIZE = 1.2; // metres - a large designed aggregate, so it falls at that pace
const PILE_STEP = 1 / 300; // seconds per physics step - the rods are thin, so small steps
const PILE_MAX_STEPS = 30; // per frame, so a slow frame plays slower rather than skipping
const PILE_SETTLE_AFTER = 9; // simulated seconds - stop by then even if something still twitches
const PILE_WAIT = 1.2; // seconds after the project appears before they're let go - the camera has arrived, the points faded in
const PILE_TIME_SCALE = 0.6; // the fall plays at this speed - slower to watch, and the same physics, so they land just as they would
const PILE_COLLISION_FATTEN = 1.4; // rods collide a little thicker than drawn, so they never pass through
// Tuned by dropping them a few hundred times off screen (cannon-es in
// Node) and counting how often all three ended up touching: 58 in 60 with
// these, about half with a livelier drop, where they rolled apart
const PILE_FRICTION = 0.9;
const PILE_BOUNCE = 0.02;
const PILE_DAMPING = 0.2; // of sliding, per second
const PILE_SPIN_DAMPING = 0.5; // of tumbling - they roll less once down
const PILE_PULL = 1.5; // a gentle pull to the middle, as if the surface were a shallow dish - see step()
const PILE_SPREAD = 0.05; // how far apart they start, sideways, as a share of the aggregate's size
const PILE_FIRST_HEIGHT = 2; // the first starts this far above the ground, in aggregate sizes - above the frame, so it falls into view
const PILE_HEIGHT_STEP = 0.7; // and each next one this much higher, so they land in turn
const PILE_SPIN = 1; // radians/s, at most, of tumble as they're let go
const PILE_SLEEP_SPEED = 0.08; // aggregate sizes per second - slower than this for a moment counts as at rest
// The surface they land on is drawn by the clicked pebble's dissolve, its
// points falling to a disc this wide (see getDissolve in script.js)
export const PILE_SURFACE_RADIUS = 0.9; // in aggregate sizes

/**
 * The straight rods a crossed-rod aggregate is made of, found from its
 * mesh: the vertex furthest out gives a rod's direction, the vertices near
 * that line refine it (their main axis) and give its length and radius,
 * and they're set aside before looking for the next. Stops when what's
 * left is too little to be a rod.
 */
export function findRods(vertices, maxRods = 8) {
    const rods = [];
    let rest = vertices;
    const minCount = vertices.length * 0.05;

    const offAxis = (v, origin, axis) => {
        const d = v.clone().sub(origin);
        const along = d.dot(axis);
        return Math.sqrt(Math.max(d.lengthSq() - along * along, 0));
    };

    while (rods.length < maxRods && rest.length >= minCount) {
        const far = rest.reduce((a, b) => (b.lengthSq() > a.lengthSq() ? b : a));
        const reach = far.length();
        if (reach === 0) break;
        const tolerance = reach * 0.1;

        let origin = new THREE.Vector3();
        let axis = far.clone().normalize();
        let near = rest.filter((v) => offAxis(v, origin, axis) < tolerance);
        if (near.length < minCount) break;

        // Refine: through the rod's own vertices, along their main spread
        origin = near.reduce((sum, v) => sum.add(v), new THREE.Vector3()).divideScalar(near.length);
        for (let i = 0; i < 8; i++) {
            const next = new THREE.Vector3();
            near.forEach((v) => {
                const d = v.clone().sub(origin);
                next.addScaledVector(d, d.dot(axis));
            });
            if (next.lengthSq() === 0) break;
            axis = next.normalize();
        }
        near = rest.filter((v) => offAxis(v, origin, axis) < tolerance);

        const along = near.map((v) => v.clone().sub(origin).dot(axis));
        const lo = Math.min(...along);
        const hi = Math.max(...along);
        const radii = near
            .filter((v, i) => along[i] > lo + (hi - lo) * 0.2 && along[i] < hi - (hi - lo) * 0.2)
            .map((v) => offAxis(v, origin, axis))
            .sort((a, b) => a - b);

        rods.push({
            centre: origin.clone().addScaledVector(axis, (lo + hi) / 2),
            axis,
            length: hi - lo,
            radius: radii.length ? radii[Math.floor(radii.length / 2)] : tolerance / 2,
        });
        rest = rest.filter((v) => offAxis(v, origin, axis) >= tolerance);
    }

    return rods;
}

/**
 * Builds the pile around one sampled aggregate (`template`, a THREE.Points
 * centred on the origin) and its rods, in the same space. `size` is how
 * big each aggregate is drawn, `groundY` where the surface sits. Returns
 * the group to show and a handle to drive it: restart() for a fresh drop,
 * step(dt, since) every frame, and settledAt once it has come to rest.
 */
export async function createPile({ template, rods, count, size, groundY, solid, solidMaterial }) {
    const CANNON = await loadPhysics();

    template.geometry.computeBoundingBox();
    const box = template.geometry.boundingBox.getSize(new THREE.Vector3());
    const scale = size / Math.max(box.x, box.y, box.z);

    const group = new THREE.Group();
    const aggregates = [];
    // Each copy the sampled cloud, or - given `solid`, the mesh in the same
    // space - the shape itself in `solidMaterial`
    for (let i = 0; i < count; i++) {
        const aggregate = solid
            ? new THREE.Mesh(solid, solidMaterial)
            : new THREE.Points(template.geometry);
        aggregate.scale.setScalar(scale);
        aggregate.visible = false;
        group.add(aggregate);
        aggregates.push(aggregate);
    }

    // What the zoom hint picks its spots from (see maybeShowTapHint)
    group.userData.points = aggregates[0];

    // The world, in the group's own units: gravity scaled so an aggregate
    // `size` across falls like one PILE_REAL_SIZE metres across
    const gravity = PILE_GRAVITY * size / PILE_REAL_SIZE;
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -gravity, 0) });
    world.allowSleep = true;
    world.defaultContactMaterial.friction = PILE_FRICTION;
    world.defaultContactMaterial.restitution = PILE_BOUNCE;

    const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    ground.position.set(0, groundY, 0);
    world.addBody(ground);

    const up = new THREE.Vector3(0, 1, 0);
    const turn = new THREE.Quaternion();
    const bodies = aggregates.map(() => {
        const body = new CANNON.Body({
            mass: 1,
            linearDamping: PILE_DAMPING,
            angularDamping: PILE_SPIN_DAMPING,
            allowSleep: true,
            sleepSpeedLimit: PILE_SLEEP_SPEED * size,
            sleepTimeLimit: 0.6,
        });
        rods.forEach((rod) => {
            const shape = new CANNON.Cylinder(
                rod.radius * scale * PILE_COLLISION_FATTEN,
                rod.radius * scale * PILE_COLLISION_FATTEN,
                rod.length * scale,
                10,
            );
            turn.setFromUnitVectors(up, rod.axis);
            body.addShape(
                shape,
                new CANNON.Vec3(rod.centre.x * scale, rod.centre.y * scale, rod.centre.z * scale),
                new CANNON.Quaternion(turn.x, turn.y, turn.z, turn.w),
            );
        });
        world.addBody(body);
        return body;
    });

    // The pull to the middle: sideways only, stronger further out, so one
    // that tumbles off the others drifts back into the pile rather than
    // settling on its own - and the pile stays centred in the frame
    world.addEventListener('preStep', () => {
        bodies.forEach((body) => {
            body.force.x -= PILE_PULL * gravity / size * body.position.x * body.mass;
            body.force.z -= PILE_PULL * gravity / size * body.position.z * body.mass;
        });
    });

    const pile = {
        group,
        settledAt: Infinity,
        time: 0,
        wait: 0,

        // A new drop: one above another, a little apart, each at its own
        // random angle and tumbling a little
        restart() {
            this.time = 0;
            this.wait = PILE_WAIT;
            this.settledAt = Infinity;
            const random = new THREE.Quaternion();
            bodies.forEach((body, i) => {
                const a = Math.random() * Math.PI * 2;
                const r = Math.random() * PILE_SPREAD * size;
                body.position.set(
                    Math.cos(a) * r,
                    groundY + size * (PILE_FIRST_HEIGHT + PILE_HEIGHT_STEP * i),
                    Math.sin(a) * r,
                );
                random.random();
                body.quaternion.set(random.x, random.y, random.z, random.w);
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(
                    (Math.random() * 2 - 1) * PILE_SPIN,
                    (Math.random() * 2 - 1) * PILE_SPIN,
                    (Math.random() * 2 - 1) * PILE_SPIN,
                );
                body.wakeUp();
            });
            this.sync();

            // Hidden while held: during the camera's move in, the start
            // positions above the frame are in view
            aggregates.forEach((points) => { points.visible = false; });
        },

        // The aggregates' extent in world space, for framing them: from
        // their points (every 16th), as a box round the axis the pile turns
        // about, so it still holds as it turns. Still falling, it's where a
        // settled pile lies - centred, about a size across and half a size
        // high (as measured over the tuning drops)
        bounds() {
            group.updateMatrixWorld(true);
            const axis = new THREE.Vector3().setFromMatrixPosition(group.matrixWorld);
            let reach = 0.6 * size;
            let low = groundY;
            let high = groundY + 0.55 * size;

            if (this.settledAt !== Infinity) {
                reach = 0;
                low = Infinity;
                high = -Infinity;
                const position = aggregates[0].geometry.attributes.position;
                const point = new THREE.Vector3();
                aggregates.forEach((points) => {
                    for (let i = 0; i < position.count; i += 16) {
                        // In the group's own space, where the turn is about Y
                        point.fromBufferAttribute(position, i).applyMatrix4(points.matrix);
                        reach = Math.max(reach, Math.hypot(point.x, point.z));
                        low = Math.min(low, point.y);
                        high = Math.max(high, point.y);
                    }
                });
            }

            const scaleY = new THREE.Vector3().setFromMatrixScale(group.matrixWorld).y;
            return new THREE.Box3(
                new THREE.Vector3(axis.x - reach * scaleY, axis.y + low * scaleY, axis.z - reach * scaleY),
                new THREE.Vector3(axis.x + reach * scaleY, axis.y + high * scaleY, axis.z + reach * scaleY),
            );
        },

        sync() {
            bodies.forEach((body, i) => {
                aggregates[i].position.set(body.position.x, body.position.y, body.position.z);
                aggregates[i].quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
            });
        },

        // Runs until everything has come to rest, then stops costing anything
        step(dt, since) {
            if (this.settledAt !== Infinity) return;

            // Held up above the frame until there's something to watch
            if (this.wait > 0) {
                this.wait -= dt;
                if (this.wait > 0) return;
                aggregates.forEach((points) => { points.visible = true; });
            }

            const simulated = dt * PILE_TIME_SCALE;
            this.time += simulated;
            world.step(PILE_STEP, simulated, PILE_MAX_STEPS);
            this.sync();

            const resting = bodies.every((body) => body.sleepState === CANNON.Body.SLEEPING);
            if (resting || this.time > PILE_SETTLE_AFTER) this.settledAt = since;
        },
    };

    pile.restart();
    return pile;
}
