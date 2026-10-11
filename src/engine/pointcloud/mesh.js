import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { MESH_FIT_SIZE } from '../constants.js';
import { POINT_INKS } from '../colors.js';

/**
 * A model that arrives as a mesh rather than a point cloud - straight out of
 * Rhino or Blender - is turned into one as it loads: points scattered over
 * its surface, more where there's more surface, so it's drawn in the same
 * inks as a scanned cloud. It's also centred and scaled to fit the pebble
 * the detail view frames, since a mesh comes in whatever units it was drawn
 * in. A point cloud is left exactly as it is.
 */
export const MESH_SAMPLE_POINTS = 20000; // a project can ask for more or fewer (`points`)

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

    // And the meshes themselves, merged, for drawing them solid (`drop.solid`)
    group.userData.solid = mergeGeometries(meshes.map((mesh) => {
        const solid = new THREE.BufferGeometry();
        solid.setAttribute('position', mesh.geometry.attributes.position.clone());
        if (mesh.geometry.index) solid.setIndex(mesh.geometry.index.clone());
        solid.applyMatrix4(mesh.matrixWorld);
        solid.translate(-centre.x, -centre.y, -centre.z);
        solid.scale(factor, factor, factor);
        solid.computeVertexNormals();
        return solid;
    }));
    return group;
}

/**
 * A solid model drawn in the inks rather than lit by the scene (whose cyan
 * lights would tint it): orange where it faces a fixed light from above,
 * deepening to the dark red where it turns away - like the points' inks,
 * laid on as shade. Opaque, so it hides what's behind it.
 */
export function makeInkMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uLit: { value: POINT_INKS[1].color },
            uShade: { value: POINT_INKS[0].color },
        },
        vertexShader: `
varying vec3 vNormal;
void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
        fragmentShader: `
uniform vec3 uLit;
uniform vec3 uShade;
varying vec3 vNormal;
void main() {
    float light = max(dot(normalize(vNormal), normalize(vec3(-0.35, 0.8, 0.5))), 0.0);
    gl_FragColor = vec4(mix(uShade, uLit, light), 1.0);
}`,
    });
}
