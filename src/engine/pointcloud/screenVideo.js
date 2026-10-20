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
const VIDEO_INSET = 0.985; // a hair inside the screen's edges, clear of its rounding
const VIDEO_FADE = 1.2; // seconds
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

export function addScreenVideo(group, screen, url) {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';

    // The film's colours as they are, like the scene's (see screenColor)
    const texture = new THREE.VideoTexture(video);

    // Its corners on the screen's face, X across and Y up as the film runs
    const face = screen.face.clone().addScaledVector(screen.out, VIDEO_LIFT);
    const u = screen.u.clone().multiplyScalar(VIDEO_INSET);
    const v = screen.v.clone().multiplyScalar(VIDEO_INSET);
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
        .flatMap(([x, y]) => face.clone().addScaledVector(u, x).addScaledVector(v, y).toArray());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);

    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, toneMapped: false });
    const quad = new THREE.Mesh(geometry, material);
    quad.raycast = () => {}; // the model's own screen answers a double-click

    // Filling the screen, cropped rather than squeezed if the shapes differ
    video.addEventListener('loadedmetadata', () => {
        const screenShape = u.length() / v.length();
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
