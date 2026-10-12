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
export const PILE_REPLAY_WAIT = 0.3; // the same, when dropped again - nothing to wait for but the pile clearing
const PILE_FADE_OUT = 1.2; // seconds the fallen pile takes to dissolve away before the next drop - hiding it at once read as abrupt
const PILE_TIME_SCALE = 0.4; // the fall plays at this speed - slower to watch, and the same physics, so they land just as they would (0.6 was asked to be slower)
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
const PILE_SLEEP_SPEED = 0.08; // cannon's sleep limit, x size - see the note on PILE_REST_* below

/**
 * When the turn starts: as soon as the pile LOOKS still, not when cannon
 * puts every body to sleep. Cannon's sleep test lumps linear and angular
 * speed together against one size-scaled limit (0.24 for a 3-unit
 * aggregate) and then waits 0.6s more, so it fired about a simulated second
 * after the aggregates had stopped translating - the residual rock of a
 * long, thin rod decays slowly - and the turn visibly lagged the landing.
 * Measured on the drop: still below these by sim ~3.0s, asleep at ~3.95s.
 * The physics carries on after this until cannon does sleep, so nothing
 * freezes mid-wobble; the model just starts turning a second sooner.
 */
const PILE_REST_SPEED = 0.12; // aggregate sizes per second
const PILE_REST_SPIN = 0.35; // radians per second
const PILE_REST_TIME = 0.2; // simulated seconds both must hold
/**
 * Where the aggregates interlock, marked with pulsing dots once the pile has
 * come fully to rest - every aggregate asleep, not just looking still (a
 * project's `drop.contacts`). The points are cannon's own
 * contacts between two aggregates - the ground's are left out - merged where
 * several sit together, since two rods crossing give a small cluster.
 * Blue, by request (graphite at first, then cyan) - it reads against the
 * graphite rods and the paper, and isn't the orange that means "click me".
 * Drawn over the rods (no depth test), so a crossing on the far side isn't
 * lost behind them.
 */
const CONTACT_MAX = 24; // dots at most
const CONTACT_MERGE = 0.12; // contacts closer than this, in aggregate sizes, are one dot
const CONTACT_PARTED = 0.04; // a crossing whose two sides have drifted this far apart, in sizes, is dropped
const CONTACT_PX = 30; // the dot's sprite across, CSS px - room for its ring to spread
const CONTACT_PULSE = 1.6; // seconds per pulse
const CONTACT_FADE_IN = 0.6; // seconds to appear once the pile is still
const CONTACT_INK = new THREE.Color().setRGB(30 / 255, 90 / 255, 225 / 255, THREE.LinearSRGBColorSpace);
// The velocity arrows stay graphite
const VELOCITY_INK = new THREE.Color().setRGB(28 / 255, 28 / 255, 30 / 255, THREE.LinearSRGBColorSpace);

/**
 * Each aggregate's velocity while it moves (a project's `drop.velocity`), the
 * way the project's own simulation plots clump velocity: an arrow from its
 * centre along its motion, as long as it is fast, and its speed in m/s (see
 * velocities(), placed as HTML by the engine). Physical speed - the
 * aggregate taken as PILE_REAL_SIZE across - not the slowed playback on
 * screen. Both fade as it comes to rest, when the interlocking dots take over.
 */
const VELOCITY_SCALE = 0.12; // arrow length per unit/s of speed, in the pile's units
const VELOCITY_MAX = 1.2; // the longest arrow, in aggregate sizes
const VELOCITY_GONE = 0.04; // m/s - slower than this shows nothing
const VELOCITY_FULL = 0.25; // m/s - and fully shown from this

function velocityShow(mps) {
    const k = Math.min(Math.max((mps - VELOCITY_GONE) / (VELOCITY_FULL - VELOCITY_GONE), 0), 1);
    return k * k * (3 - 2 * k);
}

function makeContactMaterial() {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
            uTime: { value: 0 },
            uShow: { value: 0 },
            uSize: { value: CONTACT_PX * Math.min(window.devicePixelRatio || 1, 2) },
            uInk: { value: CONTACT_INK },
        },
        vertexShader: `
uniform float uSize;
attribute float aPhase;
varying float vPhase;
void main() {
    vPhase = aPhase;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize;
}`,
        // A solid dot, and a ring that spreads from it and fades, each dot
        // on its own beat. smoothstep edges kept in increasing order (a
        // reversed one is undefined on Safari).
        fragmentShader: `
uniform float uTime;
uniform float uShow;
uniform vec3 uInk;
varying float vPhase;
void main() {
    float d = distance(gl_PointCoord, vec2(0.5)) * 2.0;
    float beat = fract(uTime / ${CONTACT_PULSE.toFixed(2)} + vPhase);
    float dot = 1.0 - smoothstep(0.16, 0.22, d);
    float r = 0.24 + 0.7 * beat;
    float ring = (1.0 - beat) * (1.0 - smoothstep(0.0, 0.07, abs(d - r)));
    float alpha = max(dot * (0.75 + 0.25 * (1.0 - beat)), ring * 0.7) * uShow;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uInk, alpha);
}`,
    });
}

// The surface they land on is drawn by the clicked pebble's dissolve, its
// points falling to a disc this wide (see getDissolve in pebbles/dissolve.js)
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
export async function createPile({
    template, rods, count, size, groundY, solid, solidMaterial, contacts = false, velocity = false,
}) {
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

    // The interlocking dots, in the group's space so they turn with the pile
    let markers = null;
    if (contacts) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CONTACT_MAX * 3), 3));
        const phases = new Float32Array(CONTACT_MAX);
        for (let i = 0; i < CONTACT_MAX; i++) phases[i] = Math.random();
        geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
        geometry.setDrawRange(0, 0);
        markers = new THREE.Points(geometry, makeContactMaterial());
        markers.frustumCulled = false;
        markers.renderOrder = 5;
        markers.raycast = () => {}; // never something to click or zoom to
        markers.userData.ownMaterial = true; // the cloud loader leaves it alone
        markers.visible = false;
        group.add(markers);
    }

    // The velocity arrows, one per aggregate, drawn over the rods
    const arrows = velocity ? aggregates.map(() => {
        const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 1, VELOCITY_INK);
        [arrow.line, arrow.cone].forEach((part) => {
            part.material.depthTest = false;
            part.material.transparent = true;
            part.renderOrder = 6;
            part.raycast = () => {};
        });
        arrow.visible = false;
        group.add(arrow);
        return arrow;
    }) : [];
    const arrowDirection = new THREE.Vector3();

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

    /**
     * Where two aggregates touch, merged into one point per crossing.
     * Gathered over the settle rather than replaced each step: cannon stops
     * reporting a contact once both bodies touching it are asleep, and they
     * fall asleep one by one, so a fresh list each step would lose dots.
     *
     * Each is kept in both bodies' own frames, not as a fixed point, so it
     * moves with them through the last of the settle - and shown only once
     * everything is asleep (placeContacts), dropping any whose two sides
     * have parted since. Read as fixed points and shown as soon as the pile
     * looked still, a crossing that slid or came apart in that last second
     * left its dot hanging in the air. Cleared by restart().
     */
    const marked = [];
    const contactPoint = new THREE.Vector3();
    const nearPoint = new THREE.Vector3();
    const sideI = new CANNON.Vec3();
    const sideJ = new CANNON.Vec3();
    const local = new CANNON.Vec3();

    // A mark's point now: halfway between where each body has it
    function markWorld(m, target) {
        bodies[m.i].pointToWorldFrame(m.onI, sideI);
        bodies[m.j].pointToWorldFrame(m.onJ, sideJ);
        return target.set((sideI.x + sideJ.x) / 2, (sideI.y + sideJ.y) / 2, (sideI.z + sideJ.z) / 2);
    }

    function readContacts() {
        if (!markers) return;

        for (const c of world.contacts) {
            const i = bodies.indexOf(c.bi);
            const j = bodies.indexOf(c.bj);
            if (i < 0 || j < 0) continue; // the ground's

            // Where each side has it; halfway between, for the dot
            sideI.set(c.bi.position.x + c.ri.x, c.bi.position.y + c.ri.y, c.bi.position.z + c.ri.z);
            sideJ.set(c.bj.position.x + c.rj.x, c.bj.position.y + c.rj.y, c.bj.position.z + c.rj.z);
            contactPoint.set((sideI.x + sideJ.x) / 2, (sideI.y + sideJ.y) / 2, (sideI.z + sideJ.z) / 2);
            local.set(contactPoint.x, contactPoint.y, contactPoint.z);

            const near = marked.find((m) => ((m.i === i && m.j === j) || (m.i === j && m.j === i))
                && markWorld(m, nearPoint).distanceTo(contactPoint) < CONTACT_MERGE * size);
            if (near) {
                // Follows the latest reading, so a crossing that slides
                // along a rod moves with it
                bodies[near.i].pointToLocalFrame(local, near.onI);
                bodies[near.j].pointToLocalFrame(local, near.onJ);
            } else if (marked.length < CONTACT_MAX) {
                const m = { i, j, onI: new CANNON.Vec3(), onJ: new CANNON.Vec3() };
                c.bi.pointToLocalFrame(local, m.onI);
                c.bj.pointToLocalFrame(local, m.onJ);
                marked.push(m);
            }
        }
    }

    /**
     * Once everything is asleep: each crossing where its two bodies now put
     * it, and only those still touching - the two sides within
     * CONTACT_PARTED of each other
     */
    function placeContacts() {
        if (!markers) return;

        const position = markers.geometry.attributes.position;
        let shown = 0;
        for (const m of marked) {
            bodies[m.i].pointToWorldFrame(m.onI, sideI);
            bodies[m.j].pointToWorldFrame(m.onJ, sideJ);
            if (sideI.distanceTo(sideJ) > CONTACT_PARTED * size) continue;
            markWorld(m, contactPoint);
            position.setXYZ(shown++, contactPoint.x, contactPoint.y, contactPoint.z);
        }
        position.needsUpdate = true;
        markers.geometry.setDrawRange(0, shown);
        shownContacts = shown;
    }
    let shownContacts = 0;

    const pile = {
        group,
        settledAt: Infinity, // when the turn starts - see PILE_REST_*
        asleep: false, // when the physics stops costing anything
        restedAt: Infinity, // when it did, as settledAt - the dots show from here
        time: 0,
        wait: 0,
        restFor: 0,
        fadeOut: 0, // seconds of dissolving left before a replay's restart
        onFaded: null,
        markedFor: 0, // seconds the interlocking dots have been showing

        // How many interlocks are shown (none until asleep), and where one is in
        // the world - for the camera's close-up on one (detail.js)
        get contactCount() {
            return markers && this.asleep ? shownContacts : 0;
        },
        contactAt(index, target) {
            return markers.localToWorld(target.fromBufferAttribute(markers.geometry.attributes.position, index));
        },

        /**
         * Drop again, but let the fallen pile dissolve away first rather than
         * vanish (PILE_FADE_OUT). It keeps turning meanwhile; `beforeRestart`
         * runs at the moment of the new drop, for the caller to take the
         * angle reached by then. Without a solid to dissolve (a pile of
         * points), or before anything has appeared, it restarts at once.
         */
        replay(wait, beforeRestart) {
            if (this.fadeOut > 0) return; // already on its way out

            const restart = () => {
                beforeRestart?.();
                this.restart(wait);
            };

            if (!solidMaterial?.uniforms.uFade || !aggregates[0].visible) {
                restart();
                return;
            }

            this.fadeOut = PILE_FADE_OUT;
            this.onFaded = restart;
        },

        // A new drop: one above another, a little apart, each at its own
        // random angle and tumbling a little
        restart(wait = PILE_WAIT) {
            this.time = 0;
            this.wait = wait;
            this.fadeOut = 0;
            this.onFaded = null;
            this.markedFor = 0;
            if (solidMaterial?.uniforms.uFade) solidMaterial.uniforms.uFade.value = 0;
            if (markers) {
                marked.length = 0;
                markers.visible = false;
                markers.geometry.setDrawRange(0, 0);
            }
            this.settledAt = Infinity;
            this.asleep = false;
            this.restedAt = Infinity;
            shownContacts = 0;
            this.restFor = 0;
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
        /**
         * Each moving aggregate's centre (in the pile's own space) and speed
         * in m/s, with how strongly to show it - for the engine to place as
         * text. Empty without `drop.velocity`.
         */
        velocities() {
            if (!velocity) return [];

            return bodies.map((body, i) => {
                const mps = body.velocity.length() * PILE_REAL_SIZE / size;
                return {
                    position: body.position,
                    mps,
                    show: aggregates[i].visible && this.fadeOut === 0 ? velocityShow(mps) : 0,
                };
            });
        },

        step(dt, since) {
            // The arrows follow the bodies every frame, asleep or not
            arrows.forEach((arrow, i) => {
                const body = bodies[i];
                const speed = body.velocity.length();
                const show = aggregates[i].visible && this.fadeOut === 0
                    ? velocityShow(speed * PILE_REAL_SIZE / size)
                    : 0;
                arrow.visible = show > 0;
                if (!arrow.visible) return;

                arrowDirection.set(body.velocity.x, body.velocity.y, body.velocity.z).divideScalar(speed);
                const length = Math.min(speed * VELOCITY_SCALE, VELOCITY_MAX * size);
                arrow.position.set(body.position.x, body.position.y, body.position.z);
                arrow.setDirection(arrowDirection);
                arrow.setLength(length, Math.min(0.25 * length, 0.18 * size), Math.min(0.15 * length, 0.1 * size));
                arrow.line.material.opacity = show;
                arrow.cone.material.opacity = show;
            });

            // The interlocking dots: in once the pile is asleep and they're
            // placed, pulsing on their own clock, out as it dissolves
            if (markers && this.asleep) {
                this.markedFor += dt;
                const fade = solidMaterial?.uniforms.uFade?.value ?? 0;
                markers.material.uniforms.uTime.value = this.markedFor;
                markers.material.uniforms.uShow.value = Math.min(this.markedFor / CONTACT_FADE_IN, 1) * (1 - fade);
                markers.visible = true;
            }

            // Dissolving before a replay, eased so it starts and ends softly
            if (this.fadeOut > 0) {
                this.fadeOut = Math.max(this.fadeOut - dt, 0);
                const k = 1 - this.fadeOut / PILE_FADE_OUT;
                solidMaterial.uniforms.uFade.value = k * k * (3 - 2 * k);
                if (this.fadeOut === 0) {
                    const done = this.onFaded;
                    this.onFaded = null;
                    done();
                    return;
                }
            }

            if (this.asleep) return;

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

            // The turn starts once nothing visibly moves...
            const still = bodies.every((body) => body.velocity.length() < PILE_REST_SPEED * size
                && body.angularVelocity.length() < PILE_REST_SPIN);
            this.restFor = still ? this.restFor + simulated : 0;
            const timedOut = this.time > PILE_SETTLE_AFTER;
            if (this.settledAt === Infinity && (this.restFor >= PILE_REST_TIME || timedOut)) {
                this.settledAt = since;
            }

            // Where they interlock, refreshed while they settle the last bit
            if (this.settledAt !== Infinity) readContacts();

            // ...and the physics stops once cannon has put everything to sleep
            const sleeping = bodies.every((body) => body.sleepState === CANNON.Body.SLEEPING);
            if (sleeping || timedOut) {
                this.asleep = true;
                this.restedAt = since;
                placeContacts();
            }
        },
    };

    pile.restart();
    return pile;
}
