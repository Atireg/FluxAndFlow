/**
 * A model exported from Rhino as OBJ (with its .mtl) into a .glb in
 * static/models/, its pieces merged into parts: by default one part per
 * material, named after it - the names the site's `parts` and `figure`
 * settings use. `labelOf` can name parts of their own instead (a glass
 * sheet, a joint), for a project's `info`; a part keeps its material's name
 * as its material either way. Flat faces keep their edges (normals creased
 * at 30 degrees), the vertices welded again. The OBJ is a one-off upload, so
 * it isn't kept in the repository or rebuilt by `npm run models`:
 *
 *     node tools/models/obj-to-glb.mjs path/to/model.obj name.glb
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { writeGlb } from './glb.mjs';

/**
 * labelOf(piece, pieces) -> a part's name, or { name, edges: true } for a part
 * whose edges the site outlines, or null for its material's name. A piece is
 * { name, material, centre, size, geometry } in the file's own space; all of
 * them come along, for a label that compares a piece with others.
 */
export function objToGlb(source, fileName, labelOf = () => null) {
    const root = new OBJLoader().parse(readFileSync(source, 'utf8'));
    root.updateMatrixWorld(true);

    // Every piece, positions only, in the file's own space
    const pieces = [];
    root.traverse((child) => {
        if (!child.isMesh) return;
        const material = (Array.isArray(child.material) ? child.material[0] : child.material).name || 'default';
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', child.geometry.getAttribute('position').clone());
        geometry.applyMatrix4(child.matrixWorld);
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        pieces.push({ name: child.name, material, centre: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()), geometry });
    });

    // ...merged into parts
    const parts = new Map();
    pieces.forEach((piece) => {
        const label = labelOf(piece, pieces);
        const name = (typeof label === 'object' ? label?.name : label) ?? piece.material;
        const edges = Boolean(label?.edges);
        const key = `${name}\u0000${piece.material}\u0000${edges}`;
        if (!parts.has(key)) parts.set(key, { name, material: piece.material, edges, geometries: [] });
        parts.get(key).geometries.push(piece.geometry);
    });

    const meshes = [...parts.values()].map(({ name, material, edges, geometries }) => {
        const creased = toCreasedNormals(mergeGeometries(geometries), Math.PI / 6);
        // The part's name kept as written - three.js makes repeated node
        // names unique as it loads, so the name itself can't be relied on
        return { name, material, extras: { part: name, ...(edges ? { edges } : {}) }, geometry: mergeVertices(creased, 1e-3) };
    });

    writeGlb(fileName, meshes, 'tools/models/obj-to-glb.mjs');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [source, fileName] = process.argv.slice(2);
    if (!source || !fileName) throw new Error('usage: node tools/models/obj-to-glb.mjs model.obj name.glb');
    objToGlb(source, fileName);
}
