import * as THREE from 'three';

/**
 * A place to stand inside a model at eye level (a project's `eyeLevel`):
 * the open spot furthest from anything at that height, among those with
 * something round them on every side - inside the structure, between its
 * columns, not out on its edge. In the cloud's own space; `eye` is a share
 * of the model's height above its lowest point, its ground.
 *
 * The points near eye height are binned into a grid over the footprint,
 * the distance from every empty cell to the nearest full one measured
 * (a breadth-first pass), and the best few kept so the spot varies from one
 * visit to the next. Returns the spot and the direction to look, along
 * the longest clear line of sight; null when nothing qualifies.
 */
const GRID = 40; // cells across the footprint, each way
const SLAB = 0.12; // points this share of the height above or below the eye count
const INNER = 0.7; // the share of the footprint, about its middle, a spot may be in
const CHOICES = 3; // picked at random from this many of the most open spots
const LOOKS = 72; // directions tried for the clearest view

export function findInsideSpot(points, eye) {
    const position = points.geometry.attributes.position;
    points.geometry.computeBoundingBox();
    const box = points.geometry.boundingBox;
    const height = box.max.y - box.min.y;
    const eyeY = box.min.y + eye * height;

    const sizeX = box.max.x - box.min.x;
    const sizeZ = box.max.z - box.min.z;
    const cell = (x, z) => [
        Math.min(GRID - 1, Math.floor((x - box.min.x) / sizeX * GRID)),
        Math.min(GRID - 1, Math.floor((z - box.min.z) / sizeZ * GRID)),
    ];

    // Which cells have something in them at eye height
    const full = new Uint8Array(GRID * GRID);
    const p = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
        p.fromBufferAttribute(position, i);
        if (Math.abs(p.y - eyeY) > SLAB * height) continue;
        const [cx, cz] = cell(p.x, p.z);
        full[cz * GRID + cx] = 1;
    }

    // Steps from every cell to the nearest full one
    const distance = new Int16Array(GRID * GRID).fill(-1);
    const queue = [];
    full.forEach((f, k) => {
        if (f) {
            distance[k] = 0;
            queue.push(k);
        }
    });
    if (!queue.length) return null;
    for (let head = 0; head < queue.length; head++) {
        const k = queue[head];
        const x = k % GRID;
        const z = (k - x) / GRID;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const nx = x + dx;
            const nz = z + dz;
            if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue;
            const n = nz * GRID + nx;
            if (distance[n] >= 0) continue;
            distance[n] = distance[k] + 1;
            queue.push(n);
        }
    }

    // Something in this direction from (x, z), within the footprint?
    const blocked = (x, z, dx, dz) => {
        for (let nx = x + dx, nz = z + dz; nx >= 0 && nz >= 0 && nx < GRID && nz < GRID; nx += dx, nz += dz) {
            if (full[nz * GRID + nx]) return true;
        }
        return false;
    };

    const margin = Math.floor(GRID * (1 - INNER) / 2);
    const spots = [];
    for (let z = margin; z < GRID - margin; z++) {
        for (let x = margin; x < GRID - margin; x++) {
            const k = z * GRID + x;
            if (full[k]) continue;
            const surrounded = blocked(x, z, 1, 0) && blocked(x, z, -1, 0) && blocked(x, z, 0, 1) && blocked(x, z, 0, -1);
            if (surrounded) spots.push({ x, z, clear: distance[k] });
        }
    }
    if (!spots.length) return null;

    spots.sort((a, b) => b.clear - a.clear);
    const spot = spots[Math.floor(Math.random() * Math.min(CHOICES, spots.length))];

    /**
     * Which way to look: the longest clear line of sight from there at eye
     * height, out between the near columns to a far one rather than into
     * the nearest - marched across the grid in LOOKS directions until it
     * meets a full cell; a line that leaves the footprint only if none
     * meets anything
     */
    let look = 0;
    let longest = -1;
    for (let k = 0; k < LOOKS; k++) {
        const angle = (k / LOOKS) * Math.PI * 2;
        const dx = Math.cos(angle);
        const dz = Math.sin(angle);
        let steps = 0;
        let ends = false; // on a far column, rather than out past the edge onto nothing
        for (let t = 0.5; ; t += 0.5) {
            const x = Math.floor(spot.x + 0.5 + dx * t);
            const z = Math.floor(spot.z + 0.5 + dz * t);
            if (x < 0 || z < 0 || x >= GRID || z >= GRID) break;
            if (full[z * GRID + x]) {
                ends = true;
                break;
            }
            steps = t;
        }
        const score = steps + (ends ? GRID * 2 : 0);
        if (score > longest) {
            longest = score;
            look = angle;
        }
    }

    // Grid cells aren't square when the footprint isn't, so turn the angle
    // into a direction in the cloud's own units
    const direction = new THREE.Vector3(Math.cos(look) * sizeX, 0, Math.sin(look) * sizeZ).normalize();

    return {
        position: new THREE.Vector3(
            box.min.x + (spot.x + 0.5) / GRID * sizeX,
            eyeY,
            box.min.z + (spot.z + 0.5) / GRID * sizeZ,
        ),
        direction,
    };
}
