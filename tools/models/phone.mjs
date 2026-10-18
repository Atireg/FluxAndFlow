/**
 * kh ReUse's phone (static/models/phone.glb), shown instead of the laptop on
 * a narrow screen: upright, screen towards +Z, a camera bump and side
 * buttons, and its screen a mesh of its own, "Screen" (X across, Y up, Z
 * out), shaped like the mobile recording (390 x 664).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { weld, writeGlb } from './glb.mjs';

function roundedRect(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
}
const slab = (w, h, r, depth, bevel, z) => {
    const g = new THREE.ExtrudeGeometry(roundedRect(w, h, r), {
        depth, curveSegments: 12,
        bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4,
    }).translate(0, 0, z);
    return g;
};

// Body: about 8.45 x 13.9, 0.9 thick, its face at z = 0.45 - the screen inside it
// shaped like the mobile recording (390 x 664)
const W = (13.9 - 0.7) * 390 / 664 + 0.7, H = 13.9, BEVEL = 0.18;
const parts = [slab(W - 2 * BEVEL, H - 2 * BEVEL, 1.0, 0.9 - 2 * BEVEL, BEVEL, -0.45 + BEVEL)];
// A camera bump on the back
parts.push(slab(2.6, 2.6, 0.7, 0.12, 0.05, -0.45 - 0.17).translate(-W / 2 + 1.9, H / 2 - 1.9, 0));
// Buttons on the sides
for (const [x, y, h] of [[W / 2, 2.8, 2.0], [-W / 2, 3.8, 1.1], [-W / 2, 2.2, 1.1]]) {
    const b = new RoundedBoxGeometry(0.16, h, 0.4, 2, 0.07).translate(x, y, 0);
    parts.push(b);
}
// The screen, inset from the edges, just proud of the face
const screenGeometry = slab(W - 0.7, H - 0.7, 0.75, 0.04, 0, 0);
const screenMatrix = new THREE.Matrix4().makeTranslation(0, 0, 0.45 + 0.005);

writeGlb('phone.glb', [
    { name: 'Phone', geometry: weld(mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part))), 1e-5) },
    { name: 'Screen', geometry: weld(screenGeometry, 1e-5), matrix: screenMatrix.toArray() },
], 'Flux and Flow phone');
