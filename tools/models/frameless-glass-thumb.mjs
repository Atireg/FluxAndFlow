/**
 * Frameless Glass Structures' pebble drawing (static/images/frameless-glass-thumb.jpg): two glass
 * sheets and the steel joint between them, taken out of the model (static/models/frameless-glass.glb)
 * and drawn as lines - their edges, seen from a little above and the side - in black on white, the
 * way a pebble's `thumbImage` wants it. The sheets are GS1 and GS2 (neighbours), the joint GS1_GS2.
 *
 *     node tools/models/frameless-glass-thumb.mjs
 *
 * Needs ImageMagick (`convert`).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const model = fileURLToPath(new URL('../../static/models/frameless-glass.glb', import.meta.url));
const out = fileURLToPath(new URL('../../static/images/frameless-glass-thumb.jpg', import.meta.url));
const PARTS = new Set(['GS1', 'GS2', 'GS1_GS2']);
const [YAW, PITCH] = [38, 32]; // degrees: how the pair is turned, then tilted towards us
const SIZE = 600;

// The glb's own JSON and binary chunks
const buffer = readFileSync(model);
const jsonLength = buffer.readUInt32LE(12);
const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString());
const bin = buffer.subarray(20 + jsonLength + 8);
const read = (index) => {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const Type = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[accessor.componentType];
    const width = { SCALAR: 1, VEC3: 3 }[accessor.type];
    const start = bin.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    return new Type(bin.buffer.slice(start, start + accessor.count * width * Type.BYTES_PER_ELEMENT));
};

// Each wanted piece's geometry
const pieces = json.nodes.filter((node) => PARTS.has(node.name)).map((node) => {
    const primitive = json.meshes[node.mesh].primitives[0];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(read(primitive.attributes.POSITION), 3));
    geometry.setIndex(new THREE.BufferAttribute(read(primitive.indices), 1));
    return { name: node.name, geometry };
});

// The joint's long axis, and the sheets' average face: the pair's own frame
const axisOf = (geometry) => {
    const p = geometry.getAttribute('position');
    const points = Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i));
    const centre = points.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / points.length);
    const m = new THREE.Matrix3();
    const e = m.elements.fill(0);
    points.forEach((v) => { const d = v.clone().sub(centre).toArray(); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e[c * 3 + r] += d[r] * d[c]; });
    const dominant = (away) => { const v = new THREE.Vector3(1, 0.6, 0.3); for (let k = 0; k < 80; k++) { v.applyMatrix3(m); if (away) v.addScaledVector(away, -v.dot(away)); v.normalize(); } return v; };
    const length = dominant();
    const width = dominant(length);
    return { centre, length, width, normal: new THREE.Vector3().crossVectors(length, width).normalize() };
};
const joint = axisOf(pieces.find((piece) => piece.name === 'GS1_GS2').geometry);
const sheets = pieces.filter((piece) => piece.name !== 'GS1_GS2').map((piece) => axisOf(piece.geometry));
const up = sheets.reduce((s, a) => s.add(a.normal.dot(sheets[0].normal) < 0 ? a.normal.clone().negate() : a.normal), new THREE.Vector3()).normalize();
const x = joint.length.clone().addScaledVector(up, -joint.length.dot(up)).normalize();
const z = new THREE.Vector3().crossVectors(x, up);
const frame = new THREE.Matrix4().makeBasis(x, up, z).transpose(); // into the pair's frame
const view = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(PITCH)).multiply(new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(YAW)));

// Every piece's edges, projected flat
const lines = [];
pieces.forEach(({ geometry }) => {
    const edges = new THREE.EdgesGeometry(geometry, 30);
    const p = edges.getAttribute('position');
    for (let i = 0; i < p.count; i += 2) {
        const a = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(frame).applyMatrix4(view);
        const b = new THREE.Vector3().fromBufferAttribute(p, i + 1).applyMatrix4(frame).applyMatrix4(view);
        lines.push([a.x, -a.y, b.x, -b.y]);
    }
});
const box = new THREE.Box2();
lines.forEach(([ax, ay, bx, by]) => box.expandByPoint(new THREE.Vector2(ax, ay)).expandByPoint(new THREE.Vector2(bx, by)));
const size = box.getSize(new THREE.Vector2());
const scale = (SIZE * 0.9) / Math.max(size.x, size.y);
const at = (vx, vy) => [(SIZE - size.x * scale) / 2 + (vx - box.min.x) * scale, (SIZE - size.y * scale) / 2 + (vy - box.min.y) * scale];

const mvg = [`viewbox 0 0 ${SIZE} ${SIZE}`, 'fill white', `rectangle 0,0 ${SIZE},${SIZE}`, 'stroke black', 'stroke-width 3', 'stroke-linecap round'];
lines.forEach(([ax, ay, bx, by]) => {
    const [x1, y1] = at(ax, ay);
    const [x2, y2] = at(bx, by);
    mvg.push(`line ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`);
});
const file = out.replace(/\.jpg$/, '.mvg');
writeFileSync(file, mvg.join('\n'));
execFileSync('convert', [`mvg:${file}`, '-strip', '-interlace', 'Plane', '-quality', '85', out]);
execFileSync('rm', [file]);
console.log('frameless-glass-thumb.jpg', lines.length, 'edges');
