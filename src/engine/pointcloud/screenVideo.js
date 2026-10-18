import * as THREE from 'three';
import { smooth01 } from '../ease.js';

/**
 * A film playing on a solid model's screen (`screenVideo`, with `screen`):
 * a quad just in front of the screen's face, under the points floating on it,
 * showing a muted, looping <video>. Until its first frames have arrived the
 * screen stays bare and the points float alone; then the film fades in and
 * the points fade away over it (`screenFilmShown`, 0..1, read by the dissolve).
 */
const VIDEO_LIFT = 0.008; // in front of the screen's face, in fitted units - behind the points
const VIDEO_INSET = 0.985; // a hair inside the screen's edges, clear of its rounding
const VIDEO_FADE = 1.2; // seconds

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

    // Fades in once it's really playing, and stays - paused, on the frame it
    // stopped at - until the project closes (playScreenVideo)
    group.userData.screenFilmSince = null;
    quad.onBeforeRender = () => {
        if (!video.paused && video.readyState >= 2) group.userData.screenFilmSince ??= performance.now();
        const since = group.userData.screenFilmSince;
        material.opacity = since === null ? 0 : smooth01((performance.now() - since) / 1000 / VIDEO_FADE);
        group.userData.screenFilmShown = material.opacity;
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
        video.play().catch(() => {}); // a refused autoplay leaves the points alone
    } else {
        video.pause();
        model.userData.screenFilmSince = null;
    }
}

// Paused by the visitor (`doubleClick: 'hold'`), staying on its frame - or going on
export function holdScreenVideo(model, held) {
    const video = model?.userData.screenVideo;
    if (!video || model.userData.screenFilmSince === null) return; // not started yet
    if (held) video.pause();
    else video.play().catch(() => {});
}
