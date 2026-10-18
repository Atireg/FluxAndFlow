/**
 * kh ReUse's laptop (static/models/laptop.glb): open 110 degrees, keys,
 * trackpad and hinge, and its screen as a mesh of its own, "Screen", in its
 * own space - X across, Y up, Z out towards the viewer - which the engine's
 * `screen` setting looks for. The screen is shaped like the recording on it
 * (16:9) so none of the film is cropped.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { weld, writeGlb } from './glb.mjs';

const parts = [];
// Every box rounded at its edges, by `radius` (at most just under half its thinnest side)
const box = (w, h, d, x, y, z, matrix, radius = 0.15, segments = 2) => {
    const r = Math.min(radius, Math.min(w, h, d) / 2 - 0.001);
    const g = new RoundedBoxGeometry(w, h, d, segments, r).translate(x, y, z);
    if (matrix) g.applyMatrix4(matrix);
    parts.push(g);
};

// Base: 32 wide, 1.4 thick, 22 deep, front edge at z = +11
const W = 32, D = 22, T = 1.4;
box(W, T, D, 0, T / 2, 0, null, 0.6, 4);

// Keyboard: 14 x 5 keys, then a row with the space bar
const keyW = 1.7, gap = 0.35, pitch = keyW + gap;
const kbTop = T, kbZ0 = -D / 2 + 3;
for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 14; c++) {
        box(keyW, 0.3, keyW, (c - 6.5) * pitch, kbTop + 0.15, kbZ0 + r * pitch);
    }
}
const row6 = kbZ0 + 5 * pitch;
for (const c of [0, 1, 2, 11, 12, 13]) box(keyW, 0.3, keyW, (c - 6.5) * pitch, kbTop + 0.15, row6);
box(8 * pitch - gap, 0.3, keyW, 0, kbTop + 0.15, row6);

// Trackpad, a thin plate in front of the keys
box(11, 0.08, 6.5, 0, T + 0.04, D / 2 - 4.2, null, 0.6, 3);

// Lid: hinged along the back edge, opened 110 degrees from shut
// The screen (LD - 2.6 tall, W - 2.4 wide) shaped like the recording, 16:9
const L = 0.7, LD = (W - 2.4) * 9 / 16 + 2.6;
const hinge = new THREE.Matrix4()
    .makeTranslation(0, T, -D / 2)
    .multiply(new THREE.Matrix4().makeRotationX(-THREE.MathUtils.degToRad(110)));
// Laid flat as if shut (extending towards +z), then swung open
box(W, L, LD, 0, L / 2, LD / 2, hinge, 0.34, 4);
// The screen, a thin raised panel on the inner face - its own mesh,
// "Screen", drawn in its own space: X across, Y up the screen, Z out of it
// towards the viewer (what the engine's `screen` setting expects)
const screenGeometry = new RoundedBoxGeometry(W - 2.4, LD - 2.6, 0.1, 3, 0.04);
const screenMatrix = hinge.clone().multiply(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0),
).setPosition(0, -0.05, LD / 2 + 0.2));

// Hinge barrel
const barrel = new THREE.CylinderGeometry(0.55, 0.55, W - 6, 24)
    .rotateZ(Math.PI / 2).translate(0, T, -D / 2);
parts.push(barrel.toNonIndexed());

writeGlb('laptop.glb', [
    { name: 'Laptop', geometry: weld(mergeGeometries(parts)) },
    { name: 'Screen', geometry: weld(screenGeometry), matrix: screenMatrix.toArray() },
], 'Flux and Flow laptop');
