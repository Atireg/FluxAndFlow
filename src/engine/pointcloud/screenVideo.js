import * as THREE from 'three';
import { smooth01 } from '../ease.js';

/**
 * A film playing on a solid model's screen (`screenVideo`, with `screen`):
 * a quad just in front of the screen's face, behind the points circling on it,
 * showing a muted, looping <video>. Until its first frames have arrived the
 * screen stays bare; then the film fades in.
 *
 * Until the film has loaded, a model with a screen turns slowly round and the
 * points on its screen circle like a loading sign; loaded, the points drift
 * gently out and fade (`screenLoading`, 1..0, read by the dissolve) and the
 * model finishes its turn to face the visitor (`screenSettled`) - with no
 * film at all it keeps turning.
 */
const VIDEO_LIFT = 0.008; // in front of the screen's face, in fitted units - behind the points
const PANEL_LIFT = 0.004; // the white screen under it
const VIDEO_INSET = 0.985; // a hair inside the screen's edges, clear of its rounding
const SCREEN_CORNER = 0.07; // the screen's (and film's) rounded corners, a share of its shorter side
const VIDEO_FADE = 0.7; // seconds
const SPIN_PERIOD = 8; // seconds a turn, while the film loads
const SPIN_SETTLE = 1; // radians from facing the visitor that the turn starts to slow
const LOADING_FADE = 2.2; // seconds for the loading circle's points to drift out and fade, once loaded
// The film counts as loaded at this, or this long after it was asked to load
// - a browser that won't preload can't keep the visitor waiting forever
const PRIME_WAIT = 8; // seconds
// ...and never sooner than this after the model is shown, so the turn and
// the loading circle are seen even when the film is in at once (cached) -
// the pebble's points take 3.6s to reach the screen
const SPIN_AT_LEAST = 6; // seconds

// A flat, rounded rectangle on the screen's face, `lift` in front of it - a
// quad with a rounded mask (the same for the white screen and the film)
function screenQuad(screen, lift, material) {
    const face = screen.face.clone().addScaledVector(screen.out, lift);
    const u = screen.u.clone().multiplyScalar(VIDEO_INSET);
    const v = screen.v.clone().multiplyScalar(VIDEO_INSET);
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
        .flatMap(([x, y]) => face.clone().addScaledVector(u, x).addScaledVector(v, y).toArray());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);

    roundCorners(material, u.length() / v.length());
    material.transparent = true;
    const quad = new THREE.Mesh(geometry, material);
    quad.raycast = () => {}; // the model's own screen answers a double-click
    return quad;
}

// Clear outside a rectangle of this shape (width / height) with rounded
// corners, worked out per pixel and smoothed over one - a mask texture
// showed its pixels, close up on a sharp screen
function roundCorners(material, shape) {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uShape = { value: shape };
        shader.uniforms.uCorner = { value: SCREEN_CORNER * Math.min(shape, 1) };
        shader.vertexShader = shader.vertexShader
            .replace('void main() {', 'varying vec2 vCornerUv;\nvoid main() {\n    vCornerUv = uv;');
        shader.fragmentShader = shader.fragmentShader
            .replace('void main() {', 'uniform float uShape;\nuniform float uCorner;\nvarying vec2 vCornerUv;\nvoid main() {')
            .replace('#include <alphamap_fragment>', `
    vec2 cornerHalf = vec2(uShape, 1.0) * 0.5;
    vec2 cornerQ = abs((vCornerUv - 0.5) * vec2(uShape, 1.0)) - cornerHalf + uCorner;
    float cornerD = length(max(cornerQ, 0.0)) + min(max(cornerQ.x, cornerQ.y), 0.0) - uCorner;
    float cornerAa = max(fwidth(cornerD), 1e-5);
    diffuseColor.a *= 1.0 - smoothstep(-cornerAa, cornerAa, cornerD);`);
    };
    material.customProgramCacheKey = () => `screen-corners-${shape.toFixed(3)}`;
}

/**
 * The screen itself, white with rounded corners, fading in with the model
 * (its `solidMaterial`'s fade) - the film plays over it
 */
export function addScreenPanel(group, screen) {
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const panel = screenQuad(screen, PANEL_LIFT, material);
    panel.onBeforeRender = () => {
        material.opacity = 1 - (group.userData.solidMaterial?.uniforms.uFade.value ?? 0);
    };
    group.add(panel);
}

export function addScreenVideo(group, screen, url) {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';

    // The film's colours as they are, like the scene's (see screenColor)
    const texture = new THREE.VideoTexture(video);

    // On the white screen, X across and Y up as the film runs, its corners
    // rounded as the screen's
    const material = new THREE.MeshBasicMaterial({ map: texture, opacity: 0, toneMapped: false });
    const quad = screenQuad(screen, VIDEO_LIFT, material);
    quad.renderOrder = 1;

    // Filling the screen, cropped rather than squeezed if the shapes differ
    video.addEventListener('loadedmetadata', () => {
        const screenShape = screen.u.length() / screen.v.length();
        const filmShape = video.videoWidth / video.videoHeight;
        if (filmShape > screenShape) texture.repeat.set(screenShape / filmShape, 1);
        else texture.repeat.set(1, filmShape / screenShape);
        texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2);
    });

    // Fades in once it's really playing - and asked to show, not just loading
    // (primeScreenVideo) - and stays, paused on the frame it stopped at,
    // until the project closes (playScreenVideo)
    group.userData.screenFilmSince = null;
    group.userData.screenFilmOn = false;
    quad.onBeforeRender = () => {
        if (group.userData.screenFilmOn && !video.paused && video.readyState >= 2) group.userData.screenFilmSince ??= performance.now();
        const since = group.userData.screenFilmSince;
        material.opacity = since === null ? 0 : smooth01((performance.now() - since) / 1000 / VIDEO_FADE);
    };

    group.add(quad);
    group.userData.screenVideo = video;
}

// Played while its project is open; closed, paused and bare again, so it
// fades back in next time
export function playScreenVideo(model, playing) {
    const video = model?.userData.screenVideo;
    if (!video) return;
    if (playing) {
        model.userData.screenFilmOn = true;
        video.play().catch(() => {}); // a refused autoplay leaves the points alone
    } else {
        video.pause();
        model.userData.screenFilmSince = null;
        model.userData.screenFilmOn = false;
    }
}

/**
 * Loaded, but not shown yet: played for a moment, unseen, and paused at its
 * start - a phone's browser loads a film only once it is asked to play it
 */
export function primeScreenVideo(model) {
    const video = model?.userData.screenVideo;
    if (!video) return;
    model.userData.screenPrimedAt ??= performance.now();
    if (video.readyState >= 3) return;
    video.addEventListener('playing', () => {
        if (model.userData.screenFilmOn) return;
        video.pause();
        video.currentTime = 0;
    }, { once: true });
    video.play().catch(() => {});
}

function screenFilmReady(model) {
    const video = model.userData.screenVideo;
    if (!video) return false;
    const now = performance.now();
    if (now - (model.userData.screenShownAt ?? 0) < SPIN_AT_LEAST * 1000) return false;
    const primedAt = model.userData.screenPrimedAt;
    return video.readyState >= 3 || (primedAt != null && now - primedAt > PRIME_WAIT * 1000);
}

// A new showing: turning and loading again, unless the film is already in
export function resetScreenSpin(model) {
    model.userData.screenShownAt = performance.now();
    model.userData.screenSpin = 0;
    model.userData.screenSettled = false;
    model.userData.screenLoading = 1;
}

/**
 * One frame of the turn while the film loads: the model's extra turn about
 * its upright, in radians - 0 once it's loaded and has come round to face the
 * visitor again, slowing over its last SPIN_SETTLE
 */
export function updateScreenSpin(model, dt) {
    const data = model.userData;
    if (!data.screen) return 0;

    const ready = screenFilmReady(model);
    const speed = (2 * Math.PI) / SPIN_PERIOD;
    data.screenSpin ??= 0;
    data.screenLoading ??= 1;
    data.screenLoading = ready ? Math.max(data.screenLoading - dt / LOADING_FADE, 0) : 1;

    if (!ready) {
        data.screenSpin += speed * dt;
        data.screenSettled = false;
    } else if (!data.screenSettled) {
        const target = Math.ceil(data.screenSpin / (2 * Math.PI) - 1e-6) * 2 * Math.PI;
        const left = target - data.screenSpin;
        data.screenSpin += Math.min(left, speed * dt * Math.max(Math.min(left / SPIN_SETTLE, 1), 0.15));
        if (target - data.screenSpin < 1e-3) {
            data.screenSpin = 0;
            data.screenSettled = true;
        }
    }
    return data.screenSpin;
}

// Paused by the visitor (`doubleClick: 'hold'`), staying on its frame - or going on
export function holdScreenVideo(model, held) {
    const video = model?.userData.screenVideo;
    if (!video || model.userData.screenFilmSince === null) return; // not started yet
    if (held) video.pause();
    else video.play().catch(() => {});
}
