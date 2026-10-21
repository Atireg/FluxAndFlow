/**
 * A model exported from Rhino as OBJ (with its .mtl) into a .glb in
 * static/models/, one part per material: every piece using a material merged
 * into one mesh, named after it - the names the site's `parts` and `figure`
 * settings use. Flat faces keep their edges (normals creased at 30 degrees),
 * the vertices welded again. The OBJ is a one-off upload, so it isn't kept in
 * the repository or rebuilt by `npm run models`:
 *
 *     node tools/models/obj-to-glb.mjs path/to/model.obj frameless-glass.glb
 */
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { writeGlb } from './glb.mjs';

const [source, fileName] = process.argv.slice(2);
if (!source || !fileName) throw new Error('usage: node tools/models/obj-to-glb.mjs model.obj name.glb');

const root = new OBJLoader().parse(readFileSync(source, 'utf8'));
root.updateMatrixWorld(true);

// Each material's pieces, positions only, in the file's own space
const byMaterial = new Map();
root.traverse((child) => {
    if (!child.isMesh) return;
    const name = (Array.isArray(child.material) ? child.material[0] : child.material).name || 'default';
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', child.geometry.getAttribute('position').clone());
    geometry.applyMatrix4(child.matrixWorld);
    if (!byMaterial.has(name)) byMaterial.set(name, []);
    byMaterial.get(name).push(geometry);
});

const meshes = [...byMaterial].map(([name, pieces]) => {
    const merged = mergeGeometries(pieces);
    const creased = toCreasedNormals(merged, Math.PI / 6);
    return { name, material: name, geometry: mergeVertices(creased, 1e-3) };
});

writeGlb(fileName, meshes, 'tools/models/obj-to-glb.mjs');
