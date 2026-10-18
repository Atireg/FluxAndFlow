/**
 * What the model scripts beside this share: welding a mesh, and writing
 * meshes out as a binary glTF (.glb) in static/models/ - positions, normals
 * and 16-bit indices, one node per mesh, a node's `matrix` if it has one.
 * Run from the repository root: `npm run models`.
 */
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Vertices that meet welded together, so rounded edges shade smoothly and
// the file stays small; the normals worked out again over the welded mesh
export function weld(geometry, tolerance = 1e-4) {
    if (geometry.getAttribute('uv')) geometry.deleteAttribute('uv');
    const welded = mergeVertices(geometry.deleteAttribute('normal'), tolerance);
    welded.computeVertexNormals();
    return welded;
}

const pad = (n) => (n + 3) & ~3;

// meshes: [{ name, geometry (indexed, welded), matrix? (16 numbers) }]
export function writeGlb(fileName, meshes, generator) {
    const chunks = [];
    const bufferViews = [];
    const accessors = [];
    let offset = 0;
    const addView = (array, target) => {
        const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
        bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
        chunks.push(bytes, Buffer.alloc(pad(bytes.length) - bytes.length));
        offset += pad(bytes.length);
        return bufferViews.length - 1;
    };

    const gltfMeshes = meshes.map(({ name, geometry }) => {
        geometry.computeBoundingBox();
        const { min, max } = geometry.boundingBox;
        const count = geometry.getAttribute('position').count;
        const indices = new Uint16Array(geometry.index.array);
        const first = accessors.length;
        accessors.push(
            { bufferView: addView(new Float32Array(geometry.getAttribute('position').array), 34962), componentType: 5126, count, type: 'VEC3', min: min.toArray(), max: max.toArray() },
            { bufferView: addView(new Float32Array(geometry.getAttribute('normal').array), 34962), componentType: 5126, count, type: 'VEC3' },
            { bufferView: addView(indices, 34963), componentType: 5123, count: indices.length, type: 'SCALAR' },
        );
        return { name, primitives: [{ attributes: { POSITION: first, NORMAL: first + 1 }, indices: first + 2 }] };
    });

    const bin = Buffer.concat(chunks);
    const json = {
        asset: { version: '2.0', generator },
        scene: 0,
        scenes: [{ nodes: meshes.map((_, i) => i) }],
        nodes: meshes.map(({ name, matrix }, i) => ({ mesh: i, name, ...(matrix ? { matrix } : {}) })),
        meshes: gltfMeshes,
        buffers: [{ byteLength: bin.length }],
        bufferViews,
        accessors,
    };

    let jsonBytes = Buffer.from(JSON.stringify(json));
    jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(pad(jsonBytes.length) - jsonBytes.length, 0x20)]);
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0); // glTF
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + 8 + jsonBytes.length + 8 + bin.length, 8);
    const chunk = (type, data) => {
        const head = Buffer.alloc(8);
        head.writeUInt32LE(data.length, 0);
        head.writeUInt32LE(type, 4);
        return Buffer.concat([head, data]);
    };

    const path = fileURLToPath(new URL(`../../static/models/${fileName}`, import.meta.url));
    writeFileSync(path, Buffer.concat([header, chunk(0x4e4f534a, jsonBytes), chunk(0x004e4942, bin)]));
    console.log(fileName, meshes.map((m) => `${m.name} ${m.geometry.getAttribute('position').count}`).join(', '));
}
