import * as THREE from 'three';

const BINS = 28; // rows of folds along a strip
const COLS = 4; // and points across it, between the two petals
const FROM = 0.06; // where along a petal a strip starts and ends, a share of its length
const TO = 0.97;
const PUSH = 0.2; // how far a fold is pushed out, a share of the strip's width there
const PUSH_ALTERNATE = 0.25; // ...and every other row only this much of it, so it creases

/**
 * Cloth between a ring of moving plates - a mechanism's petals (`cloth`): a
 * pleated strip from each plate's edge to its neighbour's, following them as
 * they move. The edges are found once on each plate in its starting pose, by
 * slicing it across its length, and carried along by the plate's own matrix
 * every time `update` runs; the folds are pushed out, away from the middle, in
 * proportion to the gap, so the strip creases like paper rather than hangs.
 *
 * `plates`: [{ mesh, geometry }] - the moving meshes and their geometry (in
 * their own space, as the group holds them); returns { mesh, update }.
 */
export function makeCloth(plates, material) {
    const edges = plates.map(({ geometry }) => plateEdges(geometry));
    const hub = plates.reduce((sum, plate, i) => sum.add(edges[i].centre), new THREE.Vector3()).multiplyScalar(1 / plates.length);

    // Every edge run from the hub out to the tip: a plate's length axis has
    // no sign of its own, and one run the other way crossed its strips over
    const reach = (p) => Math.hypot(p.x - hub.x, p.z - hub.z);
    edges.forEach(({ sides }) => sides.forEach((side) => {
        if (reach(side[0]) > reach(side[side.length - 1])) side.reverse();
    }));

    // Round the ring, by angle about the model's vertical axis
    const order = plates.map((_, i) => i)
        .sort((a, b) => Math.atan2(edges[a].centre.z - hub.z, edges[a].centre.x - hub.x)
            - Math.atan2(edges[b].centre.z - hub.z, edges[b].centre.x - hub.x));

    // Each plate's outer edge - the long edge lower and further out from the
    // ring's axis (the red line in the user's picture), where the cloth hangs
    // from - joined to the next one round's
    const outer = edges.map(({ sides }) => {
        const score = (side) => side.reduce((sum, p) => sum + Math.hypot(p.x - hub.x, p.z - hub.z) - p.y, 0);
        return score(sides[0]) > score(sides[1]) ? sides[0] : sides[1];
    });
    const strips = order.map((index, n) => {
        const next = order[(n + 1) % order.length];
        return { a: outer[index], b: outer[next], plates: [index, next] };
    });

    const triangles = strips.length * (BINS - 1) * COLS * 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(triangles * 9), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(triangles * 9), 3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false; // its bounds move with the plates
    mesh.raycast = () => {};
    mesh.renderOrder = 1;

    // The strip's points: a row for each place along the petals, COLS + 1 across
    const P = Array.from({ length: BINS }, () => Array.from({ length: COLS + 1 }, () => new THREE.Vector3()));
    const B = new THREE.Vector3();
    const inward = new THREE.Vector3();
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const hubNow = new THREE.Vector3();
    const [e1, e2, face] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

    const update = () => {
        // The ring's middle where its plates are now
        hubNow.set(0, 0, 0);
        plates.forEach(({ mesh: plate }, i) => hubNow.add(edges[i].centre.clone().applyMatrix4(plate.matrix)));
        hubNow.multiplyScalar(1 / plates.length);

        let at = 0;
        const put = (p, q, r) => {
            face.crossVectors(e1.subVectors(q, p), e2.subVectors(r, p)).normalize();
            [p, q, r].forEach((v) => {
                position.setXYZ(at, v.x, v.y, v.z);
                normal.setXYZ(at, face.x, face.y, face.z);
                at++;
            });
        };

        strips.forEach(({ a, b, plates: [first, second] }) => {
            const matrixA = plates[first].mesh.matrix;
            const matrixB = plates[second].mesh.matrix;
            for (let j = 0; j < BINS; j++) {
                const row = P[j];
                row[0].copy(a[j]).applyMatrix4(matrixA);
                B.copy(b[j]).applyMatrix4(matrixB);
                const gap = row[0].distanceTo(B);
                // Folded out, away from the ring's axis, by the gap there - the
                // cloth bulging outside the petals, not hidden between them
                inward.set((row[0].x + B.x) / 2 - hubNow.x, 0, (row[0].z + B.z) / 2 - hubNow.z);
                if (inward.lengthSq() > 1e-12) inward.normalize();
                const push = gap * PUSH * (j % 2 ? 1 : PUSH_ALTERNATE);
                for (let k = 1; k <= COLS; k++) {
                    row[k].lerpVectors(row[0], B, k / COLS);
                    if (k < COLS) row[k].addScaledVector(inward, push * Math.sin(Math.PI * k / COLS));
                }
            }
            for (let j = 0; j < BINS - 1; j++) {
                for (let k = 0; k < COLS; k++) {
                    put(P[j][k], P[j][k + 1], P[j + 1][k]);
                    put(P[j][k + 1], P[j + 1][k + 1], P[j + 1][k]);
                }
            }
        });
        position.needsUpdate = true;
        normal.needsUpdate = true;
    };

    update();
    return { mesh, update };
}

/**
 * A flat plate's two long edges, found by slicing its triangles across its
 * length at BINS places: the outermost point on each side at each. `centre`
 * is the plate's middle; `sides` its two edges (BINS points each).
 */
function plateEdges(geometry) {
    const position = geometry.getAttribute('position');
    const index = geometry.index;
    const count = index ? index.count : position.count;
    const vertex = (i) => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(i) : i);

    const points = [];
    for (let i = 0; i < position.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(position, i));
    const centre = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / points.length);

    // Its axes: along it, across it in its plane, and its normal
    const { length, width } = axesOf(points, centre);

    let lowest = Infinity;
    let highest = -Infinity;
    points.forEach((p) => {
        const along = p.clone().sub(centre).dot(length);
        lowest = Math.min(lowest, along);
        highest = Math.max(highest, along);
    });

    const sides = { low: [], high: [] };
    for (let j = 0; j < BINS; j++) {
        const at = lowest + (highest - lowest) * (FROM + (TO - FROM) * (j / (BINS - 1)));
        let low = null;
        let high = null;
        let lowAcross = Infinity;
        let highAcross = -Infinity;
        for (let i = 0; i < count; i += 3) {
            const tri = [vertex(i), vertex(i + 1), vertex(i + 2)];
            const d = tri.map((p) => p.clone().sub(centre).dot(length) - at);
            for (let k = 0; k < 3; k++) {
                const l = (k + 1) % 3;
                if (d[k] === d[l] || d[k] * d[l] > 0) continue;
                const p = tri[k].clone().lerp(tri[l], d[k] / (d[k] - d[l]));
                const across = p.clone().sub(centre).dot(width);
                if (across < lowAcross) { lowAcross = across; low = p; }
                if (across > highAcross) { highAcross = across; high = p; }
            }
        }
        sides.low.push(low ?? centre.clone());
        sides.high.push(high ?? centre.clone());
    }

    return { centre, sides: [sides.low, sides.high] };
}

// A cloud's longest axis, and the longer of the other two (its width), by
// power iteration on its covariance
function axesOf(points, centre) {
    const cov = new THREE.Matrix3();
    const e = cov.elements.fill(0);
    points.forEach((p) => {
        const d = p.clone().sub(centre);
        const v = [d.x, d.y, d.z];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e[c * 3 + r] += v[r] * v[c];
    });
    const dominant = (matrix, away) => {
        let v = new THREE.Vector3(1, 0.7, 0.3);
        for (let k = 0; k < 60; k++) {
            v.applyMatrix3(matrix);
            if (away) v.addScaledVector(away, -v.dot(away));
            if (v.lengthSq() < 1e-30) break;
            v.normalize();
        }
        return v;
    };
    const length = dominant(cov);
    const width = dominant(cov, length);
    return { length, width };
}
