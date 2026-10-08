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
const PILE_SETTLE_AFTER = 9; // seconds - stop simulating by then even if something still twitches
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
const PILE_FIRST_HEIGHT = 0.9; // the first starts this far above the ground, in aggregate sizes
const PILE_HEIGHT_STEP = 0.7; // and each next one this much higher, so they land in turn
const PILE_SPIN = 1; // radians/s, at most, of tumble as they're let go
const PILE_SLEEP_SPEED = 0.08; // aggregate sizes per second - slower than this for a moment counts as at rest
const SURFACE_POINTS = 1200;
const SURFACE_RADIUS = 0.9; // in aggregate sizes

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
export async function createPile({ template, rods, count, size, groundY }) {
    const CANNON = await loadPhysics();

    template.geometry.computeBoundingBox();
    const box = template.geometry.boundingBox.getSize(new THREE.Vector3());
    const scale = size / Math.max(box.x, box.y, box.z);

    const group = new THREE.Group();
    const aggregates = [];
    for (let i = 0; i < count; i++) {
        const points = new THREE.Points(template.geometry);
        points.scale.setScalar(scale);
        points.visible = false;
        group.add(points);
        aggregates.push(points);
    }

    // The surface, as a faint disc of points in the grey ink
    const surfacePositions = new Float32Array(SURFACE_POINTS * 3);
    for (let i = 0; i < SURFACE_POINTS; i++) {
        const r = Math.sqrt(Math.random()) * size * SURFACE_RADIUS;
        const a = Math.random() * Math.PI * 2;
        surfacePositions[i * 3] = Math.cos(a) * r;
        surfacePositions[i * 3 + 1] = groundY;
        surfacePositions[i * 3 + 2] = Math.sin(a) * r;
    }
    const surfaceGeometry = new THREE.BufferGeometry();
    surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(surfacePositions, 3));
    const surface = new THREE.Points(surfaceGeometry);
    surface.userData.tone = 2; // see loadPointCloudWithShaderMaterial
    group.add(surface);

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

        // A new drop: one above another, a little apart, each at its own
        // random angle and tumbling a little
        restart() {
            this.time = 0;
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
            aggregates.forEach((points) => { points.visible = true; });
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

            this.time += dt;
            world.step(PILE_STEP, dt, PILE_MAX_STEPS);
            this.sync();

            const resting = bodies.every((body) => body.sleepState === CANNON.Body.SLEEPING);
            if (resting || this.time > PILE_SETTLE_AFTER) this.settledAt = since;
        },
    };

    pile.restart();
    return pile;
}
