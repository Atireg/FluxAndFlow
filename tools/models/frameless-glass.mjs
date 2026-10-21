/**
 * Frameless Glass Structures' model: the user's Rhino OBJ (glasstec.obj),
 * its pieces named after the user's drawing so a project's `info` can say
 * what each is - eight glass sheets GS1-GS8 (GS1-GS4 on one side of the
 * ridge, GS5-GS8 on the other, row 1 and 4 the sloping ends), the steel
 * joints between them (each an upper and a lower profile, one part), the
 * steel along the ridge, and the supports at the sheets' bottom edges
 * (`_UK`). The rest stays a part per material. The model is symmetric, so
 * which end is row 1 is a choice.
 *
 *     node tools/models/frameless-glass.mjs path/to/glasstec.obj
 */
import * as THREE from 'three';
import { objToGlb } from './obj-to-glb.mjs';

const source = process.argv[2];
if (!source) throw new Error('usage: node tools/models/frameless-glass.mjs glasstec.obj');

// Along the ridge (z, mm): the sloping end, the two middle rows, the other end
const rowAt = (z) => (z > 1700 ? 1 : z > 0 ? 2 : z > -1700 ? 3 : 4);
const sheet = (row, x) => `GS${x < 0 ? row : row + 4}`;
const joint = (a, b) => `${a}_${b}`;

// A piece's own facing: its triangles' normals weighted by their area, upwards
function facing(geometry) {
    const position = geometry.attributes.position;
    const sum = new THREE.Vector3();
    const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    for (let i = 0; i < position.count; i += 3) {
        a.fromBufferAttribute(position, i);
        b.fromBufferAttribute(position, i + 1);
        c.fromBufferAttribute(position, i + 2);
        const n = b.clone().sub(a).cross(c.clone().sub(a));
        sum.add(n.y < 0 ? n.negate() : n);
    }
    return sum.normalize();
}

const isGlass = ({ material }) => material === 'Glass' || material === 'Custom (2)';
const sheetOf = ({ centre: { x, z } }) => sheet(rowAt(z), x);

// A sheet's upper ply: the glass piece furthest out along the sheet's facing
// (the facing of its biggest piece) - its edges outlined on the site
const upper = new Map();
function upperPly(piece, pieces) {
    const name = sheetOf(piece);
    if (!upper.has(name)) {
        const plies = pieces.filter((other) => isGlass(other) && other.geometry.attributes.position.count > 10 && sheetOf(other) === name);
        const biggest = plies.reduce((most, ply) => (ply.geometry.attributes.position.count > most.geometry.attributes.position.count ? ply : most));
        const out = facing(biggest.geometry);
        upper.set(name, plies.reduce((top, ply) => (ply.centre.dot(out) > top.centre.dot(out) ? ply : top)));
    }
    return upper.get(name) === piece;
}

objToGlb(source, 'frameless-glass.glb', (piece, pieces) => {
    const { material, centre: { x, y, z }, size } = piece;
    // The glass, ply by ply, to the sheet it lies in - its upper ply outlined
    if (isGlass(piece)) return { name: sheetOf(piece), edges: upperPly(piece, pieces) };
    // The steel along the ridge: at the sloping ends (Custom 7 and 8), and
    // the middle rows' (thin, long along z, up at the ridge)
    if (material === 'Custom (7)' || material === 'Custom (8)'
        || (material === 'Metal' && size.x < 100 && size.z > 1500 && y > 2000)) {
        const row = rowAt(z);
        return joint(sheet(row, -1), sheet(row, 1));
    }
    if (material !== 'Metal') return null;
    // The joints across the ridge, up on the glass, between two rows
    if (y > 1900 && size.x > 1300) {
        const [a, b] = z > 1000 ? [1, 2] : z > -1000 ? [2, 3] : [3, 4];
        return joint(sheet(a, x), sheet(b, x));
    }
    // The supports under the sloping ends' bottom edges
    if (y > 600 && y < 800 && size.x > 600 && size.x < 800) return `${sheet(rowAt(z), x)}_UK`;
    return null;
});
