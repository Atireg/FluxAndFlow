/**
 * Nap Nap Hooray's pebble thumbnail (static/models/moon.glb): a crescent
 * moon, extruded and bevelled, lying face up for the playground's camera
 * from above. The crescent is the outer circle less an offset inner one.
 */
import * as THREE from 'three';
import { weld, writeGlb } from './glb.mjs';

const R = 1; // the moon
const r = 0.84; // the circle bitten out of it, `d` to the right
const d = 0.52;

// Where the two circles cross
const cx = (R * R - r * r + d * d) / (2 * d);
const cy = Math.sqrt(R * R - cx * cx);
const outerFrom = Math.atan2(cy, cx);
const innerFrom = Math.atan2(-cy, cx - d);
const innerTo = Math.atan2(cy, cx - d);

const shape = new THREE.Shape();
const steps = 48;
// Round the outside, the long way past the left
for (let i = 0; i <= steps; i++) {
    const a = outerFrom + (2 * Math.PI - 2 * outerFrom) * (i / steps);
    const x = R * Math.cos(a);
    const y = R * Math.sin(a);
    i ? shape.lineTo(x, y) : shape.moveTo(x, y);
}
// ...and back along the bite, also past the left
const innerSweep = (innerFrom - innerTo + 2 * Math.PI) % (2 * Math.PI);
for (let i = 1; i < steps; i++) {
    const a = innerFrom - innerSweep * (i / steps);
    shape.lineTo(d + r * Math.cos(a), r * Math.sin(a));
}

const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 4, curveSegments: 12,
});

writeGlb('moon.glb', [
    { name: 'Moon', geometry: weld(geometry.rotateX(-Math.PI / 2), 1e-5) },
], 'Flux and Flow moon');
