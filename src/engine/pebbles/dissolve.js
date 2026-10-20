import * as THREE from 'three';
import { PEBBLE_RIM_COLOR, pointInkUniforms, POINT_OPACITY } from '../colors.js';
import { PILE_SURFACE_RADIUS } from '../pile.js';
import { smooth01 } from '../ease.js';
import { addTrails } from '../pointcloud/trails.js';
import { revealAt } from '../pointcloud/gather.js';
import { detailSince } from '../camera/framing.js';
import { PEBBLE_FLUX_GLSL, PEBBLE_FLUX_SPEED, fluxAmount } from './geometry.js';
import trailCornerGlsl from '../shaders/trail/corner.glsl';
import inkGlsl from '../shaders/pointCloud/ink.glsl';

/**
 * The dissolve: a clicked pebble gives way to a cloud of points. Its face
 * and rim fade (DISSOLVE_FADE) while points scattered over its surface swell
 * outward and turn from the rim's graphite to the project's own inks, then
 * thin away - by when the project's points are gathering out of their own
 * scattered cloud, so one cloud seems to become the other. Like the drop, a
 * pure function of time since the click: one uniform a frame.
 *
 * A project with a `drop` instead has its points fall into a disc and stay
 * there, as the ground its aggregates land on (uGround). One with a `screen`
 * has them settle onto its model's screen, in the inks, circling there like
 * a loading sign until its film has loaded, then fading where they are
 * (uScreen).
 */
const DISSOLVE_DURATION = 3.6; // seconds from the click to the last point gone - overlapping the move in and the gather
export const DISSOLVE_FADE = 0.5; // seconds for the face and rim to give way
const DISSOLVE_POINTS = 2400;
const DISSOLVE_SWELL = 0.55; // how far the cloud swells past the pebble's surface, as a share
const DISSOLVE_DRIFT = 0.9; // units each point also wanders off on its own
const DISSOLVE_POINT_SIZE = 0.07; // world units across
const DISSOLVE_TRAIL = 0.12; // seconds back for the dissolve's points
const SCREEN_EVERY = 3; // one point in this many settles on the screen; the rest fade as usual
// On the screen they circle like a loading sign: an arc of the circle,
// turning, brightest at its head - and once the film has loaded they drift
// gently outwards as they fade (screenVideo.js's `screenLoading`)
const SPINNER_RATE = 4.5; // radians a second
const SPINNER_ARC = 4.7; // radians the arc spans, head to tail - three quarters of the circle
const SPINNER_RADIUS = 0.55; // of the screen's shorter half
const SPINNER_TRAIL = 0.15; // seconds back for their tails
const SPINNER_RELEASE = 0.7; // how far out they drift as they go, at most, as a share of the circle
// Points hold, swollen, at this share of the dissolve until the screen they're
// to settle on has loaded - rather than falling towards nowhere
const SCREEN_HOLD = 0.25;

/**
 * Where a dissolving point is at T (0..1 of the dissolve), shared by the
 * points and their tails. `falling` is how far down to a pile's ground it is.
 */
const DISSOLVE_GLSL = `
uniform float uT;
uniform float uSwell;
uniform float uGround; // 1: the points fall and stay as a pile's surface (aGround)
uniform float uScreen; // 1: ...or on a screen (uGround too), floating about on it
uniform float uTime;
uniform float uRelease; // 0..1 as the loading circle lets its points go
uniform vec3 uScreenCentre; // the screen's middle, and the vectors to its right and top edges
uniform vec3 uScreenU;
uniform vec3 uScreenV;
attribute float aScreen; // a point's place along the loading circle, 0..2pi
attribute float aStay; // 1 for the points that settle on a screen
attribute vec3 aDrift;
attribute float aDelay;
attribute vec3 aNormal;
attribute vec3 aGround;
${PEBBLE_FLUX_GLSL}

// Whether this point lands and stays: all of a pile's ground, some of a screen's
float landsHere() {
    return uGround * mix(1.0, aStay, uScreen);
}

// Where a point is on the loading circle at a time: its place along the arc
// (0 the tail, 1 the head), the circle round on the screen whatever its shape
vec3 screenPoint(float time) {
    float along = aScreen / 6.2831853;
    float angle = -time * ${SPINNER_RATE.toFixed(2)} - along * ${SPINNER_ARC.toFixed(2)};
    float radius = ${SPINNER_RADIUS.toFixed(2)} * min(length(uScreenU), length(uScreenV)) * (0.92 + 0.16 * fract(aScreen * 3.7))
        * (1.0 + uRelease * ${SPINNER_RELEASE.toFixed(2)} * (0.4 + 0.6 * fract(aScreen * 7.3)));
    return uScreenCentre + (normalize(uScreenU) * cos(angle) + normalize(uScreenV) * sin(angle)) * radius;
}

// On the loading circle, fainter towards the arc's tail
float spinnerInk() {
    return mix(1.0, 0.15 + 0.85 * aScreen / 6.2831853, uScreen);
}

vec3 dissolvePosition(vec3 home, float T, float time, out float falling) {
    // From the pebble's shape at the moment it was clicked, flux and all
    vec3 start = home + aNormal * pebbleFlux(normalize(home)) * uFluxAmount;

    float t = clamp((T - aDelay) / (1.0 - aDelay), 0.0, 1.0);
    float rest = 1.0 - t;
    float swell = 1.0 - rest * rest;
    vec3 p = start * (1.0 + uSwell * swell) + aDrift * swell;

    // Or swell out, then fall - each in turn, gathering speed - to its own
    // place on the ground, and stay there
    float puff = smoothstep(0.0, 0.3, T);
    vec3 swollen = start * (1.0 + uSwell * puff) + aDrift * puff;
    falling = clamp((T - 0.25 - aDelay * 0.35) / 0.35, 0.0, 1.0);
    // Chosen, not mixed: with no screen its vectors are zero, normalize()
    // gives NaN, and NaN times nothing is still NaN - the ground vanished
    vec3 ground = uScreen > 0.5 ? screenPoint(time) : aGround;
    vec3 landed = mix(swollen, ground, falling * falling);
    return mix(p, landed, landsHere());
}

// How much ink a point lays down at T, before its tail's fade
float dissolveAlpha(float T, float falling) {
    float fading = 1.0 - smoothstep(0.55, 1.0, T);
    // (a pile's ground lighter once landed; a screen's points not)
    return smoothstep(0.0, 0.12, T) * mix(fading, 1.0 - 0.45 * falling * (1.0 - uScreen), landsHere()) * spinnerInk();
}`;

const dissolveVertexShader = `
uniform float uPixelsPerUnit;
uniform float uSize;
attribute float aTone;
varying float vAlpha;
varying float vInk;
varying float vTone;
${DISSOLVE_GLSL}

void main() {
    float falling;
    vec4 mv = modelViewMatrix * vec4(dissolvePosition(position, uT, uTime, falling), 1.0);
    gl_Position = projectionMatrix * mv;
    // Landed, they're finer and fainter - a ground, not a cloud
    float settled = falling * landsHere() * (1.0 - uScreen);
    gl_PointSize = uSize * (1.0 - 0.5 * settled) * uPixelsPerUnit / max(-mv.z, 0.001);

    vAlpha = dissolveAlpha(uT, falling);
    vInk = smoothstep(0.1, 0.6, uT);
    vTone = aTone;
}`;

// A dissolving point's tail (see addTrails)
const dissolveTrailVertexShader = `
uniform float uPixelsPerUnit;
uniform float uSize;
uniform float uTrailLag;
attribute vec3 aHome;
attribute float aTone;
varying float vAlpha;
varying float vInk;
varying float vTone;
${DISSOLVE_GLSL}
${trailCornerGlsl}

void main() {
    float falling;
    float before;
    vec4 headView = modelViewMatrix * vec4(dissolvePosition(aHome, uT, uTime, falling), 1.0);
    vec4 tailView = modelViewMatrix * vec4(dissolvePosition(aHome, max(uT - uTrailLag, 0.0), uTime - ${SPINNER_TRAIL.toFixed(2)}, before), 1.0);

    float settled = falling * landsHere() * (1.0 - uScreen);
    float width = uSize * (1.0 - 0.5 * settled) * uPixelsPerUnit / max(-headView.z, 0.001);
    float moving;
    gl_Position = trailCorner(headView, tailView, width, moving);

    vAlpha = (1.0 - position.x) * moving * dissolveAlpha(uT, falling);
    vInk = smoothstep(0.1, 0.6, uT);
    vTone = aTone;
}`;

const dissolveTrailFragmentShader = `${inkGlsl}
uniform vec3 uRim;
uniform float uTrailOpacity;
varying float vAlpha;
varying float vInk;
varying float vTone;

void main() {
    gl_FragColor = vec4(mix(uRim, pickInk(vTone), vInk), vAlpha * uOpacity * uTrailOpacity);
}`;

const dissolveFragmentShader = `${inkGlsl}
uniform vec3 uRim;
varying float vAlpha;
varying float vInk;
varying float vTone;

void main() {
    float disc = 1.0 - step(0.5, distance(gl_PointCoord, vec2(0.5)));
    gl_FragColor = vec4(mix(uRim, pickInk(vTone), vInk), disc * vAlpha * uOpacity);
}`;

// Built the first time a pebble is clicked, then kept for later opens
export function getDissolve(pebble) {
    if (pebble.userData.dissolve) return pebble.userData.dissolve;

    const surface = pebble.geometry.attributes.position;
    const surfaceNormals = pebble.geometry.attributes.normal;
    const positions = new Float32Array(DISSOLVE_POINTS * 3);
    const normals = new Float32Array(DISSOLVE_POINTS * 3);
    const drifts = new Float32Array(DISSOLVE_POINTS * 3);
    const delays = new Float32Array(DISSOLVE_POINTS);
    const tones = new Float32Array(DISSOLVE_POINTS);
    const grounds = new Float32Array(DISSOLVE_POINTS * 3);
    const screens = new Float32Array(DISSOLVE_POINTS);
    const stays = new Float32Array(DISSOLVE_POINTS);
    const v = new THREE.Vector3();
    const screen = Boolean(pebble.userData.project?.screen);

    // A project dropped onto a surface (`drop`) gets its surface from these:
    // each point's place on a disc on the ground, in the grey ink
    const drop = pebble.userData.project?.drop;
    const groundRadius = drop ? (drop.size ?? 3) * PILE_SURFACE_RADIUS : 0;

    for (let i = 0; i < DISSOLVE_POINTS; i++) {
        // A point on the pebble's surface, nudged a little off it
        const vertex = Math.floor(Math.random() * surface.count);
        v.fromBufferAttribute(surface, vertex);
        v.addScalar((Math.random() - 0.5) * 0.15);
        v.toArray(positions, i * 3);
        v.fromBufferAttribute(surfaceNormals, vertex);
        v.toArray(normals, i * 3);

        v.randomDirection().multiplyScalar(DISSOLVE_DRIFT * (0.3 + 0.7 * Math.random()));
        v.toArray(drifts, i * 3);

        delays[i] = Math.random() * 0.3;
        tones[i] = drop ? 2 : Math.floor(Math.random() * 3);

        screens[i] = Math.random() * Math.PI * 2;
        stays[i] = i % SCREEN_EVERY === 0 ? 1 : 0;

        if (drop) {
            const r = Math.sqrt(Math.random()) * groundRadius;
            const a = Math.random() * Math.PI * 2;
            grounds[i * 3] = Math.cos(a) * r;
            grounds[i * 3 + 1] = drop.ground ?? 0;
            grounds[i * 3 + 2] = Math.sin(a) * r;
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aNormal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('aGround', new THREE.BufferAttribute(grounds, 3));
    geometry.setAttribute('aScreen', new THREE.BufferAttribute(screens, 1));
    geometry.setAttribute('aStay', new THREE.BufferAttribute(stays, 1));
    geometry.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 3));
    geometry.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));
    geometry.setAttribute('aTone', new THREE.BufferAttribute(tones, 1));

    const points = new THREE.Points(geometry, new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: dissolveVertexShader,
        fragmentShader: dissolveFragmentShader,
        uniforms: {
            uT: { value: 0 },
            uSwell: { value: DISSOLVE_SWELL },
            uPixelsPerUnit: { value: 1 },
            uSize: { value: DISSOLVE_POINT_SIZE },
            uRim: { value: PEBBLE_RIM_COLOR },
            ...pointInkUniforms(),
            uGround: { value: drop || screen ? 1 : 0 },
            uScreen: { value: screen ? 1 : 0 },
            uTime: { value: 0 },
            uRelease: { value: 0 },
            uScreenCentre: { value: new THREE.Vector3() },
            uScreenU: { value: new THREE.Vector3() },
            uScreenV: { value: new THREE.Vector3() },
            // The pebble's flux, held where it was at the click (see updateDissolve)
            uFluxTime: { value: 0 },
            uFluxSeed: { value: pebble.userData.fluxSeed ?? 0 },
            uFluxAmount: { value: fluxAmount(pebble.userData.size) },
        },
    }));
    // Points that stay once they've landed, on a pile's ground or a screen
    points.userData.ground = Boolean(drop || screen);
    points.userData.screen = screen;
    points.visible = false;
    points.renderOrder = 2;
    points.raycast = () => {}; // never something to click on

    points.userData.trails = addTrails(points, {
        vertexShader: dissolveTrailVertexShader,
        fragmentShader: dissolveTrailFragmentShader,
        names: ['aNormal', 'aGround', 'aScreen', 'aStay', 'aDrift', 'aDelay', 'aTone'],
        lag: DISSOLVE_TRAIL / DISSOLVE_DURATION,
    });

    pebble.add(points);
    pebble.userData.dissolve = points;
    return points;
}

/**
 * Runs while a project is being opened or is open; state.droppingFrom is the
 * pebble that was clicked.
 */
export function updateDissolve({ state, renderer, camera, elapsedTime }) {
    const points = state.droppingFrom?.userData.dissolve;
    if (!points) return;

    // Each open starts the dissolve afresh
    if (points.userData.from !== state.dropStartedAt) {
        points.userData.from = state.dropStartedAt;
        points.userData.waited = 0;
    }

    const detail = state.droppingFrom.userData.detail;
    const shown = state.view === 'detail' && state.selected === state.droppingFrom && detail?.visible;

    // A pile's surface stays; otherwise the cloud is gone by the end
    let t = (elapsedTime - state.dropStartedAt - points.userData.waited) / DISSOLVE_DURATION;
    const ground = points.userData.ground;

    // Points bound for a screen wait for it, then carry on from there
    const screen = points.userData.screen && shown ? detail.userData.screen : null;
    if (points.userData.screen) {
        if (!screen && t > SCREEN_HOLD) {
            points.userData.waited += (t - SCREEN_HOLD) * DISSOLVE_DURATION;
            t = SCREEN_HOLD;
        }
        if (screen) placeScreen(points.material.uniforms, screen, detail);
    }

    points.visible = ground || t < 1;
    if (!points.visible) return;

    // Giving way to the project's own points as they appear (REVEAL_DURATION)
    // - unless it's becoming the ground they land on
    const reveal = shown && !ground
        ? revealAt(detailSince(state.droppingFrom, elapsedTime))
        : 0;

    // Tails until everything has landed or gone - and on a screen, for good,
    // behind the points circling there
    points.userData.trails.visible = t < 1 || points.userData.screen;

    const uniforms = points.material.uniforms;
    uniforms.uT.value = Math.min(t, 1);
    uniforms.uTime.value = elapsedTime;
    // ...and on a screen, drifting out as they fade once its film has loaded (screenVideo.js)
    const release = screen ? smooth01(1 - (detail.userData.screenLoading ?? 1)) : 0;
    uniforms.uRelease.value = release;
    uniforms.uOpacity.value = POINT_OPACITY * (1 - reveal) * (1 - release);
    uniforms.uFluxTime.value = state.dropStartedAt * PEBBLE_FLUX_SPEED;
    uniforms.uPixelsPerUnit.value = renderer.domElement.height
        / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov ?? 45) / 2));
}

// The model's screen, from its own space into the pebble's (the dissolve's)
const screenTurn = new THREE.Matrix3();
function placeScreen(uniforms, screen, model) {
    model.updateMatrix();
    screenTurn.setFromMatrix4(model.matrix);
    uniforms.uScreenCentre.value.copy(screen.centre).applyMatrix4(model.matrix);
    uniforms.uScreenU.value.copy(screen.u).applyMatrix3(screenTurn);
    uniforms.uScreenV.value.copy(screen.v).applyMatrix3(screenTurn);
}

