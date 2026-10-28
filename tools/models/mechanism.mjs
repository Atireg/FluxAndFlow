/**
 * A model that moves, from the user's Rhino OBJ exported twice - the same
 * objects, once in each pose: the model in its OPEN pose, and what takes each
 * moving part to the closed pose in the node's extras (`motion`), for the
 * site's `mechanism` setting to play between them.
 *
 * The petals (`petel_1`..`petel_5`) each turn about their own hinge - the
 * rotation is found from the two files by fitting each part's vertices - and
 * the pieces named `rack` slide as one. Everything else is fixed, merged into
 * `frame`, `motor` and `screws`; objects with no faces (curves) are left out.
 * The two files' meshes must have the same vertices in each part, which a
 * Rhino mesh made once and moved gives.
 *
 *     node tools/models/mechanism.mjs open.obj closed.obj mechanism.glb
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { writeGlb } from './glb.mjs';

// An OBJ's objects: name, positions (flat), triangles (faces fanned)
function readObj(path) {
    const positions = [];
    const objects = [];
    let current = null;
    let first = 0;
    readFileSync(path, 'utf8').split('\n').forEach((line) => {
        if (line.startsWith('o ')) {
            current = { name: line.slice(2).trim(), positions: [], indices: [] };
            first = positions.length;
            objects.push(current);
        } else if (line.startsWith('v ')) {
            const point = line.split(/\s+/).slice(1, 4).map(Number);
            positions.push(point);
            current.positions.push(...point);
        } else if (line.startsWith('f ') && current) {
            const corners = line.trim().split(/\s+/).slice(1).map((corner) => Number(corner.split('/')[0]) - 1 - first);
            for (let i = 1; i < corners.length - 1; i++) current.indices.push(corners[0], corners[i], corners[i + 1]);
        }
    });
    return objects.filter((object) => object.indices.length);
}

const geometryOf = ({ positions, indices }) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    return geometry;
};

// One part's geometry: its pieces merged, creased at 30 degrees, welded
function merged(objects) {
    const creased = toCreasedNormals(mergeGeometries(objects.map((o) => geometryOf(o).toNonIndexed())), Math.PI / 6);
    return mergeVertices(creased, 1e-3);
}

const pointsOf = (objects) => objects.flatMap((o) => Array.from({ length: o.positions.length / 3 }, (_, i) => new THREE.Vector3(...o.positions.slice(i * 3, i * 3 + 3))));

// The rotation that takes the points `from` to `to` (Kabsch, by three.js's
// own maths): its axis, a point on it, the angle in radians, and how far off
// the fit is
function fitRotation(from, to) {
    const centre = (list) => list.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / list.length);
    const [fc, tc] = [centre(from), centre(to)];
    // The covariance, then its rotation by power iteration on the quaternion form (Horn's method)
    const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    from.forEach((p, i) => {
        const a = p.clone().sub(fc).toArray();
        const b = to[i].clone().sub(tc).toArray();
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S[r][c] += a[r] * b[c];
    });
    const [Sxx, Sxy, Sxz, Syx, Syy, Syz, Szx, Szy, Szz] = S.flat();
    const N = [
        [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
        [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
        [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
        [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
    ];
    let q = [1, 0, 0, 0];
    // Shifted so the largest eigenvalue dominates
    const shift = N.flat().reduce((m, x) => Math.max(m, Math.abs(x)), 0) * 4;
    for (let k = 0; k < 500; k++) {
        const next = N.map((row, r) => row.reduce((s, x, c) => s + x * q[c], 0) + shift * q[r]);
        const norm = Math.hypot(...next);
        q = next.map((x) => x / norm);
    }
    const quaternion = new THREE.Quaternion(q[1], q[2], q[3], q[0]).normalize();
    const turn = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
    const shift3 = tc.clone().sub(fc.clone().applyMatrix4(turn));
    const error = Math.max(...from.map((p, i) => p.clone().applyMatrix4(turn).add(shift3).distanceTo(to[i])));

    // The axis and angle; the pivot is where the turn leaves a point in place,
    // taken along the axis nearest the part's middle
    let angle = 2 * Math.acos(Math.min(1, Math.abs(quaternion.w)));
    const axis = new THREE.Vector3(quaternion.x, quaternion.y, quaternion.z);
    if (axis.length() < 1e-9) return { axis: [0, 1, 0], pivot: [0, 0, 0], angle: 0, error };
    axis.normalize();
    if (quaternion.w < 0) axis.negate();
    // (x - pivot) turned + pivot = x turned + shift  ->  pivot = (I - R)^-1 shift, along the axis free
    const pivot = fc.clone();
    const along = shift3.dot(axis);
    const perpendicular = shift3.clone().addScaledVector(axis, -along);
    // pivot (perpendicular to the axis): (I - R) p = perpendicular, solved by the half-angle relation
    const half = angle / 2;
    const cross = new THREE.Vector3().crossVectors(axis, perpendicular);
    const p = perpendicular.clone().multiplyScalar(0.5).add(cross.multiplyScalar(0.5 / Math.tan(half)));
    pivot.copy(p).addScaledVector(axis, fc.clone().sub(p).dot(axis));
    return { axis: axis.toArray(), pivot: pivot.toArray(), angle, error, slide: along };
}

export function mechanismToGlb(openPath, closedPath, fileName) {
    const open = readObj(openPath);
    const closed = readObj(closedPath);
    const named = (list, test) => list.filter((o) => test(o.name));
    const isPetal = (name) => name.startsWith('petel_');
    const isRack = (name) => name === 'rack';

    const meshes = [];

    // The petals: each its own part, the turn from open to closed
    for (let n = 1; n <= 5; n++) {
        const name = `petel_${n}`;
        const [from] = named(open, (x) => x === name);
        const [to] = named(closed, (x) => x === name);
        if (!from || !to || from.positions.length !== to.positions.length) throw new Error(`${name}: not the same mesh in both files`);
        const fit = fitRotation(pointsOf([from]), pointsOf([to]));
        if (fit.error > 1e-2) throw new Error(`${name}: not a rigid turn (off by ${fit.error})`);
        const sign = fit.slide;
        if (Math.abs(sign) > 1e-2) console.log(`${name}: also slides ${sign.toFixed(3)} along its axis`);
        console.log(name, 'turns', (fit.angle * 180 / Math.PI).toFixed(2), 'deg about', fit.axis.map((x) => x.toFixed(3)).join(' '), 'through', fit.pivot.map((x) => x.toFixed(1)).join(' '));
        meshes.push({
            name, material: 'petal', geometry: merged([from]),
            extras: { part: name, motion: { type: 'rotate', axis: fit.axis, pivot: fit.pivot, angle: fit.angle } },
        });
    }

    // The rack: its pieces together, sliding as the one biggest piece does
    const rackOpen = named(open, isRack);
    const rackClosed = named(closed, isRack);
    const biggest = (list) => list.reduce((a, b) => (b.positions.length > a.positions.length ? b : a));
    const [bo, bc] = [biggest(rackOpen), biggest(rackClosed)];
    const slide = pointsOf([bc])[0].sub(pointsOf([bo])[0]);
    const moved = pointsOf(rackOpen).map((p) => p.add(slide));
    const target = pointsOf(rackClosed);
    // Every closed vertex must be an open one slid (the pieces may come in another order)
    const key = (p) => p.toArray().map((x) => Math.round(x * 100)).join(',');
    const have = new Set(target.map(key));
    const missing = moved.filter((p) => !have.has(key(p))).length;
    if (missing) throw new Error(`rack: ${missing} vertices don't land where the closed file has them`);
    console.log('rack slides', slide.toArray().map((x) => x.toFixed(3)).join(' '));
    meshes.push({
        name: 'rack', material: 'rack', geometry: merged(rackOpen),
        extras: { part: 'rack', motion: { type: 'slide', by: slide.toArray() } },
    });

    // The fixed parts, in the open file
    [['frame', (name) => name === 'frame' || name.startsWith('object_')], ['motor', (name) => name === 'motor'], ['screws', (name) => name === 'screws']]
        .forEach(([name, test]) => {
            const objects = named(open, test);
            if (objects.length) meshes.push({ name, material: name, geometry: merged(objects), extras: { part: name } });
        });

    writeGlb(fileName, meshes, 'tools/models/mechanism.mjs');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [open, closed, fileName] = process.argv.slice(2);
    if (!open || !closed || !fileName) throw new Error('usage: node tools/models/mechanism.mjs open.obj closed.obj name.glb');
    mechanismToGlb(open, closed, fileName);
}
