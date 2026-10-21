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
import { objToGlb } from './obj-to-glb.mjs';

const source = process.argv[2];
if (!source) throw new Error('usage: node tools/models/frameless-glass.mjs glasstec.obj');

// Along the ridge (z, mm): the sloping end, the two middle rows, the other end
const rowAt = (z) => (z > 1700 ? 1 : z > 0 ? 2 : z > -1700 ? 3 : 4);
const sheet = (row, x) => `GS${x < 0 ? row : row + 4}`;
const joint = (a, b) => `${a}_${b}`;

objToGlb(source, 'frameless-glass.glb', ({ material, centre: { x, y, z }, size }) => {
    // The glass, ply by ply, to the sheet it lies in
    if (material === 'Glass' || material === 'Custom (2)') return sheet(rowAt(z), x);
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
