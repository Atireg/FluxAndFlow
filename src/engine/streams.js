import * as THREE from 'three';
import { smooth01 } from './ease.js';

/**
 * Streams: the start-up loader's flowing particles, carried on into the
 * catalog as part of the scene. They drift along the same braided current,
 * on the plane through the pebbles' middles (y = 0), and part round each
 * pebble like a current round stones - so seen from above they never cross
 * one: what passes close under a pebble's top is hidden by it (the lines
 * draw after the pebbles, depth-tested), and the rest turn aside. Each
 * keeps a short history of where it has been and is drawn as a fading
 * line through it. See DECISIONS.md, "The loader's streams carry on among
 * the pebbles".
 */
const STREAM_COUNT = 700;
const STREAM_HISTORY = 10; // points along each line
const STREAM_SAMPLE = 0.04; // seconds between them - the line reaches 0.36s back
const STREAM_SPEED = 2.6; // units a second
const STREAM_LIFE = [1.2, 3.6]; // seconds before a stream starts again elsewhere
const STREAM_FREQ = 0.09; // of the current's waves, per unit - the loader's, at the grid's scale
const STREAM_ALPHA = 0.55; // a line's ink at its head
const STREAM_FADE = 1.2; // seconds to come in or go
// Taking over the loader's own particles as it leaves: from its pace, they
// settle to the streams' own over this long
const HANDOVER = 2.6; // seconds - the loader's exit
const PART_REACH = 1.4; // within this many of a pebble's radii a stream turns aside
const PART_TURN = 1.8; // how much of the drift into it is turned aside, at its edge
// Towards the pointer: while the mouse moves over the grid or a finger is
// down, the streams drift slowly towards it (still parting round the
// pebbles on the way), and go back to their own current once it stops
const PULL_SPEED = 1.6; // units a second - slower than the current
const PULL_SHARE = 0.85; // how much of a stream's way the pull takes over, at full
const PULL_SLOW = 2; // units - within this of the pointer they slow, rather than swarm it
const PULL_IN = 0.8; // seconds for the pull to take hold
const PULL_OUT = 1.6; // seconds to let go
// With the page's wind (setWind): the streams turn to blow across the screen
// with it, gusting, still braided a little by their own current
const WIND_SHARE = 0.75; // how much of a stream's way the wind takes over
const WIND_SPEED = 1.2; // of STREAM_SPEED, at an average gust
const WIND_IN = 1.5; // seconds for it to take hold, or to drop

// The loader's two flow colours, a stream shaded between them by the way it
// flows (index.html's palette)
const FROM = [15, 45, 55];
const TO = [200, 110, 50];

// The current's direction at a point: the loader's angle(), in scene units
function angle(x, z, t) {
    return Math.sin(x * STREAM_FREQ + t * 0.25) * 1.6
        + Math.cos(z * STREAM_FREQ * 1.2 - t * 0.2) * 1.4
        + Math.sin((x - z) * STREAM_FREQ * 0.51 + t * 0.12) * 1.1;
}

export function createStreams(scene) {
    const segments = STREAM_COUNT * (STREAM_HISTORY - 1);
    const positions = new Float32Array(segments * 2 * 3);
    const alphas = new Float32Array(segments * 2);
    const colors = new Float32Array(segments * 2 * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));

    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uOpacity: { value: 0 } },
        vertexShader: `
            attribute float aAlpha;
            attribute vec3 aColor;
            varying float vAlpha;
            varying vec3 vColor;
            void main() {
                vAlpha = aAlpha;
                vColor = aColor;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            uniform float uOpacity;
            varying float vAlpha;
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4(vColor, vAlpha * uOpacity);
            }`,
    });

    const lines = new THREE.LineSegments(geometry, material);
    lines.frustumCulled = false; // they move every frame
    lines.renderOrder = 3; // after the pebbles, so a pebble's top hides what passes under it
    lines.raycast = () => {};
    lines.visible = false;
    scene.add(lines);

    // Each stream: where it's been (x, z per history point, newest first),
    // its age and life, and time since its last history point
    const history = new Float32Array(STREAM_COUNT * STREAM_HISTORY * 2);
    const age = new Float32Array(STREAM_COUNT);
    const life = new Float32Array(STREAM_COUNT);
    const sinceSample = new Float32Array(STREAM_COUNT);
    let extent = { x: 20, z: 20 };
    let started = false;
    let pull = 0; // 0..1, eased
    const pullTo = { x: 0, z: 0 };
    let pace = 1; // the loader's speed over the streams', at the handover
    let paceLeft = 0; // seconds until they're at their own
    let blowing = 0; // how far the wind has taken hold, 0..1

    function spawn(i, randomAge, x = (Math.random() * 2 - 1) * extent.x, z = (Math.random() * 2 - 1) * extent.z) {
        for (let k = 0; k < STREAM_HISTORY; k++) {
            history[(i * STREAM_HISTORY + k) * 2] = x;
            history[(i * STREAM_HISTORY + k) * 2 + 1] = z;
        }
        life[i] = STREAM_LIFE[0] + Math.random() * (STREAM_LIFE[1] - STREAM_LIFE[0]);
        age[i] = randomAge ? Math.random() * life[i] : 0;
        sinceSample[i] = 0;
    }

    return {
        /**
         * The loader's particles, taken over where they are as it leaves
         * (`points`: [{ x, z }] on the streams' plane, `speed`: theirs, in
         * units a second) - rather than new streams fading in among them
         * while the old ones fade out.
         */
        takeOver(points, speed) {
            if (!points.length) return;
            for (let i = 0; i < STREAM_COUNT; i++) {
                const point = points[i % points.length];
                spawn(i, true, point.x, point.z);
            }
            started = true;
            material.uniforms.uOpacity.value = 1;
            pace = speed > 0 ? speed / STREAM_SPEED : 1;
            paceLeft = HANDOVER;
        },

        /**
         * One frame. `pebbles`: [{ x, z, r }] in the scene; `view`: the half
         * width and depth of the plane the camera sees ({ x, z }); `show`:
         * whether they belong on screen (the catalog) - they fade in and out;
         * `pointer`: { x, z } on their plane while it should draw them, or null;
         * `wind`: { x, z } the way it blows on their plane, `on` while it does.
         */
        update(dt, t, pebbles, view, show, pointer, wind) {
            const target = show ? 1 : 0;
            const opacity = material.uniforms.uOpacity;
            opacity.value += Math.sign(target - opacity.value) * Math.min(Math.abs(target - opacity.value), dt / STREAM_FADE);
            lines.visible = opacity.value > 0.001;
            if (!lines.visible) return;

            if (view) extent = view;
            if (pointer) {
                pullTo.x = pointer.x;
                pullTo.z = pointer.z;
            }
            pull = pointer ? Math.min(pull + dt / PULL_IN, 1) : Math.max(pull - dt / PULL_OUT, 0);
            blowing = wind?.on ? Math.min(blowing + dt / WIND_IN, 1) : Math.max(blowing - dt / WIND_IN, 0);
            const windShare = smooth01(blowing) * WIND_SHARE;
            const pulling = smooth01(pull) * PULL_SHARE * (1 - windShare);
            paceLeft = Math.max(paceLeft - dt, 0);
            const speed = STREAM_SPEED * (1 + (pace - 1) * smooth01(paceLeft / HANDOVER));
            if (!started) {
                for (let i = 0; i < STREAM_COUNT; i++) spawn(i, true);
                started = true;
            }

            for (let i = 0; i < STREAM_COUNT; i++) {
                const head = i * STREAM_HISTORY * 2;
                let x = history[head];
                let z = history[head + 1];

                const a = angle(x, z, t);
                let vx = Math.cos(a) * speed;
                let vz = Math.sin(a) * speed;

                // Blown across the screen, in gusts that cross it from the left
                if (windShare > 0) {
                    const gust = WIND_SPEED * STREAM_SPEED
                        * (1 + 0.35 * Math.sin(t * 0.31 - x * 0.05) + 0.15 * Math.sin(t * 0.83 + z * 0.07));
                    vx += (wind.x * gust - vx) * windShare;
                    vz += (wind.z * gust - vz) * windShare;
                }

                // Drawn slowly towards the pointer
                if (pulling > 0) {
                    const tx = pullTo.x - x;
                    const tz = pullTo.z - z;
                    const d = Math.hypot(tx, tz) || 1;
                    const speed = PULL_SPEED * Math.min(d / PULL_SLOW, 1);
                    vx += (tx / d * speed - vx) * pulling;
                    vz += (tz / d * speed - vz) * pulling;
                }

                // Round the pebbles: the part of the drift heading into one is
                // turned aside, more the closer it is; one inside is eased out
                for (let o = 0; o < pebbles.length; o++) {
                    const pebble = pebbles[o];
                    const dx = x - pebble.x;
                    const dz = z - pebble.z;
                    const d = Math.hypot(dx, dz) || 1;
                    const reach = pebble.r * PART_REACH;
                    if (d >= reach) continue;
                    const nx = dx / d;
                    const nz = dz / d;
                    const near = 1 - d / reach;
                    const inward = vx * nx + vz * nz;
                    if (inward < 0) {
                        const turn = Math.min(1, near * PART_TURN);
                        vx -= nx * inward * turn;
                        vz -= nz * inward * turn;
                    }
                    if (d < pebble.r) {
                        vx += nx * STREAM_SPEED * near * 2;
                        vz += nz * STREAM_SPEED * near * 2;
                    }
                }

                x += vx * dt;
                z += vz * dt;
                age[i] += dt;
                sinceSample[i] += dt;

                // A new history point now and then; the newest always follows the head
                if (sinceSample[i] >= STREAM_SAMPLE) {
                    sinceSample[i] = 0;
                    history.copyWithin(head + 2, head, head + (STREAM_HISTORY - 1) * 2);
                }
                history[head] = x;
                history[head + 1] = z;

                if (age[i] > life[i] || Math.abs(x) > extent.x * 1.1 || Math.abs(z) > extent.z * 1.1) spawn(i, false);

                // Its lines, fading back along it, and in and out over its life
                const lifeFade = Math.min(age[i] / 0.4, 1, (life[i] - age[i]) / 0.4);
                const shade = (vz / (Math.hypot(vx, vz) || 1) + 1) / 2; // by the way it's going
                const r = (FROM[0] + (TO[0] - FROM[0]) * shade) / 255;
                const g = (FROM[1] + (TO[1] - FROM[1]) * shade) / 255;
                const b = (FROM[2] + (TO[2] - FROM[2]) * shade) / 255;
                for (let k = 0; k < STREAM_HISTORY - 1; k++) {
                    const s = (i * (STREAM_HISTORY - 1) + k) * 2;
                    for (let e = 0; e < 2; e++) {
                        const h = head + (k + e) * 2;
                        positions[(s + e) * 3] = history[h];
                        positions[(s + e) * 3 + 1] = 0;
                        positions[(s + e) * 3 + 2] = history[h + 1];
                        alphas[s + e] = STREAM_ALPHA * Math.max(lifeFade, 0) * (1 - (k + e) / (STREAM_HISTORY - 1));
                        colors[(s + e) * 3] = r;
                        colors[(s + e) * 3 + 1] = g;
                        colors[(s + e) * 3 + 2] = b;
                    }
                }
            }

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.aAlpha.needsUpdate = true;
            geometry.attributes.aColor.needsUpdate = true;
        },
    };
}
