/**
 * kh ReUse's pebble thumbnail (static/models/reuse.glb): a reuse sign, three
 * arrows chasing round a circle, extruded and bevelled, lying face up for the
 * playground's camera from above.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { weld, writeGlb } from './glb.mjs';

const R = 1, BAND = 0.26, HEAD = 0.27, HEAD_LENGTH = 0.32, SWEEP = THREE.MathUtils.degToRad(88);
const point = (r, a) => new THREE.Vector2(r * Math.cos(a), r * Math.sin(a));
const parts = [];
for (let k = 0; k < 3; k++) {
    const a0 = k * 2 * Math.PI / 3 + 0.12;
    const a1 = a0 + SWEEP;
    const tip = a1 + HEAD_LENGTH / R;
    const shape = new THREE.Shape();
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
        const p = point(R + BAND / 2, a0 + (a1 - a0) * i / steps);
        i ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y);
    }
    // The arrowhead, wider than the band, pointing on round the circle
    const out = point(R + BAND / 2 + HEAD - BAND / 2 + 0.06, a1);
    const tipPoint = point(R, tip);
    const inn = point(R - BAND / 2 - HEAD + BAND / 2 - 0.06, a1);
    shape.lineTo(out.x, out.y);
    shape.lineTo(tipPoint.x, tipPoint.y);
    shape.lineTo(inn.x, inn.y);
    for (let i = steps; i >= 0; i--) {
        const p = point(R - BAND / 2, a0 + (a1 - a0) * i / steps);
        shape.lineTo(p.x, p.y);
    }
    const g = new THREE.ExtrudeGeometry(shape, {
        depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: 8,
    });
    parts.push(g);
}

writeGlb('reuse.glb', [
    { name: 'Reuse', geometry: weld(mergeGeometries(parts).rotateX(-Math.PI / 2), 1e-5) },
], 'Flux and Flow reuse sign');
