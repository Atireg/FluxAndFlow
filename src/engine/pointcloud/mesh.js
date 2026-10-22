import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { MESH_FIT_SIZE } from '../constants.js';
import { POINT_INKS, screenColor } from '../colors.js';

/**
 * A model that arrives as a mesh rather than a point cloud - straight out of
 * Rhino or Blender - is turned into one as it loads: points scattered over
 * its surface, more where there's more surface, so it's drawn in the same
 * inks as a scanned cloud. It's also centred and scaled to fit the pebble
 * the detail view frames, since a mesh comes in whatever units it was drawn
 * in. A point cloud is left exactly as it is.
 */
const MESH_SAMPLE_POINTS = 20000; // a project can ask for more or fewer (`points`)

export function pointsFromMeshes(root, total = MESH_SAMPLE_POINTS) {
    root.updateMatrixWorld(true);

    const meshes = [];
    root.traverse((child) => { if (child.isMesh) meshes.push(child); });
    if (!meshes.length) return null;

    // Each mesh gets points in proportion to its surface area
    const area = (mesh) => {
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
        const position = geometry.attributes.position;
        const triangle = new THREE.Triangle();
        let total = 0;
        for (let i = 0; i < position.count; i += 3) {
            triangle.a.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
            triangle.b.fromBufferAttribute(position, i + 1).applyMatrix4(mesh.matrixWorld);
            triangle.c.fromBufferAttribute(position, i + 2).applyMatrix4(mesh.matrixWorld);
            total += triangle.getArea();
        }
        return total;
    };
    const areas = meshes.map(area);
    const totalArea = areas.reduce((sum, value) => sum + value, 0) || 1;

    const positions = new Float32Array(total * 3);
    const point = new THREE.Vector3();
    let written = 0;

    meshes.forEach((mesh, index) => {
        const count = index === meshes.length - 1
            ? total - written
            : Math.round(total * areas[index] / totalArea);
        const sampler = new MeshSurfaceSampler(mesh).build();

        for (let i = 0; i < count; i++, written++) {
            sampler.sample(point);
            point.applyMatrix4(mesh.matrixWorld);
            point.toArray(positions, written * 3);
        }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Centred on the origin, its longest side MESH_FIT_SIZE
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    const centre = geometry.boundingBox.getCenter(new THREE.Vector3());
    const factor = MESH_FIT_SIZE / (Math.max(size.x, size.y, size.z) || 1);
    geometry.translate(-centre.x, -centre.y, -centre.z);
    geometry.scale(factor, factor, factor);

    const group = new THREE.Group();
    group.add(new THREE.Points(geometry));

    // The meshes' vertices in the same space, for anything that needs the
    // shape itself rather than points on it (a pile's rods)
    const vertices = [];
    meshes.forEach((mesh) => {
        const position = mesh.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            vertices.push(new THREE.Vector3().fromBufferAttribute(position, i)
                .applyMatrix4(mesh.matrixWorld).sub(centre).multiplyScalar(factor));
        }
    });
    group.userData.vertices = vertices;
    // How the file's own space was fitted, for finding a part of it again (`screen`)
    group.userData.fit = { centre, factor };

    // And the meshes themselves, fitted the same way, for drawing them solid:
    // merged (`solid`, `drop.solid`), and each as a part named after its
    // material (`parts`, `figure`)
    const fitted = (mesh) => {
        const solid = new THREE.BufferGeometry();
        solid.setAttribute('position', mesh.geometry.attributes.position.clone());
        if (mesh.geometry.index) solid.setIndex(mesh.geometry.index.clone());
        solid.applyMatrix4(mesh.matrixWorld);
        solid.translate(-centre.x, -centre.y, -centre.z);
        solid.scale(factor, factor, factor);
        solid.computeVertexNormals();
        return solid;
    };
    const solids = meshes.map(fitted);
    group.userData.solid = mergeGeometries(solids);
    // (`material` the look's name; `part` its own, from the file's extras -
    // a glass sheet, a joint - for a project's `info`)
    group.userData.parts = meshes.map((mesh, i) => ({
        material: mesh.material?.name || mesh.name,
        part: mesh.userData.part ?? mesh.name,
        // its edges outlined (`edges` in the file's extras - a sheet's upper ply)
        edges: Boolean(mesh.userData.edges),
        geometry: solids[i],
    }));
    return group;
}

/**
 * A solid model drawn in the inks rather than lit by the scene (whose cyan
 * lights would tint it): orange where it faces a fixed light from above,
 * deepening to the dark red where it turns away - like the points' inks,
 * laid on as shade. Opaque, so it hides what's behind it - unless given an
 * `opacity` under 1 (glass). A project's `solid: { lit, shade }` gives its
 * own pair, as screen [r, g, b], and `parts` one for each of a model's parts.
 */
// A clip short of anything: nothing cut (the parts are kept beyond it)
export const CLIP_NONE = -1e6;

// A fixed grain over the surface, in the mesh's own space so it turns with
// it. Fading is done by dropping more of the grain - a dissolve into specks
// rather than a see-through ghost - so it stays opaque and three interlocked
// copies need no sorting. A hash without sin(), which loses precision on
// some mobile GPUs. (The parts and a section's fill, so they dissolve alike.)
const INK_GRAIN_GLSL = `
float inkGrain(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
`;

export function makeInkMaterial({ lit, shade, opacity = 1 } = {}) {
    // See-through (`opacity` under 1, glass): both faces, and it doesn't hide
    // what's behind it from the depth test
    const clear = opacity < 1;
    return new THREE.ShaderMaterial({
        transparent: clear,
        depthWrite: !clear,
        side: clear ? THREE.DoubleSide : THREE.FrontSide,
        uniforms: {
            uLit: { value: lit ? screenColor(...lit) : POINT_INKS[1].color },
            uShade: { value: shade ? screenColor(...shade) : POINT_INKS[0].color },
            // 0..1, how far it has dissolved away - see pile.js's fade
            uFade: { value: 0 },
            uOpacity: { value: opacity },
            // 0..1, picked out under the pointer (a part with `info`)
            uHighlight: { value: 0 },
            // Cut away short of this along the model's length (z, its own
            // space) - a project's `section`
            uClip: { value: CLIP_NONE },
        },
        vertexShader: `
varying vec3 vNormal;
varying vec3 vInkLocal;
void main() {
    vNormal = normalize(normalMatrix * normal);
    vInkLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
        fragmentShader: `
uniform vec3 uLit;
uniform vec3 uShade;
uniform float uFade;
uniform float uOpacity;
uniform float uHighlight;
uniform float uClip;
varying vec3 vNormal;
varying vec3 vInkLocal;

${INK_GRAIN_GLSL}
void main() {
    if (inkGrain(floor(vInkLocal * 40.0)) < uFade || vInkLocal.z < uClip) discard;
    // (a see-through part's back faces lit as its own, turned towards us)
    vec3 normal = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    float light = max(dot(normal, normalize(vec3(-0.35, 0.8, 0.5))), 0.0);
    // Picked out: deeper, and glass less clear
    vec3 ink = mix(uShade, uLit, light) * (1.0 - 0.3 * uHighlight);
    gl_FragColor = vec4(ink, mix(uOpacity, max(uOpacity, 0.45), uHighlight));
}`,
    });
}

/**
 * Thin lines in an ink for a solid model's outlines (a part's `edges`, the
 * section's cut), fading in with it and cut by its section like its parts:
 * `fade` and `clip` are the model's own uniforms
 */
export function makeEdgeMaterial(ink, { fade, clip }) {
    return new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { uInk: { value: ink }, uFade: fade, uClip: clip },
        vertexShader: `
varying float vAlong;
void main() {
    vAlong = position.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
        fragmentShader: `
uniform vec3 uInk;
uniform float uFade;
uniform float uClip;
varying float vAlong;
void main() {
    if (vAlong < uClip) discard;
    gl_FragColor = vec4(uInk, 1.0 - uFade);
}`,
    });
}

// A section's cut faces (cutFaces, load.js): flat orange, dissolving with
// the parts
export function makeCutFill(ink, { fade }) {
    return new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        // just behind the cut's black lines, which lie in the same plane
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        uniforms: { uInk: { value: ink }, uFade: fade },
        vertexShader: `
varying vec3 vLocal;
void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
        fragmentShader: `
uniform vec3 uInk;
uniform float uFade;
varying vec3 vLocal;
${INK_GRAIN_GLSL}
void main() {
    if (inkGrain(floor(vLocal * 40.0)) < uFade) discard;
    gl_FragColor = vec4(uInk, 1.0);
}`,
    });
}
