import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PEBBLE_RADIUS, PEBBLE_SQUASH } from '../constants.js';

/**
 * A pebble's shape. The catalog's objects are smooth, flattened stones
 * rather than boxes. Each is its own shape (a seeded wobble on a squashed
 * sphere). A box drew its outline with edge lines; a pebble has no edges, so
 * a second skin on the same geometry draws its silhouette instead - see
 * materials.js.
 */
const PEBBLE_LUMPS = 0.06; // how far the surface wanders from round
const PEBBLE_STRETCH = 0.08; // how far each is drawn out along its own axes
const PEBBLE_DETAIL = 8; // icosphere subdivisions - smooth at its size; 16 was four times the vertices for nothing

/**
 * The flux: each pebble slowly changes shape - a few broad waves rolling
 * over its surface, swelling one side as another eases, never quite
 * repeating, each pebble on its own seed. Done in the vertex shader of the
 * face and of the rim alike (the same function, so the rim stays on the
 * face) off one shared clock - a pure function of time, nothing stored.
 * Clicking and hovering still use the resting shape, near enough.
 *
 * The surface's direction (`pebbleNormal`) is worked out on the moving
 * shape too, from two points just beside each vertex, so the shading and the
 * rim follow the waves rather than sliding over them - read off the resting
 * shape, the light swam across the surface as it moved, which read as a
 * tremble.
 *
 * Any new pebble material needs addPebbleFlux too, or it will sit still
 * while the rest breathe.
 */
const PEBBLE_FLUX = 0.3; // how far the surface moves, as a share of the radius - 0.09 and 0.15 read as too subtle
export const PEBBLE_FLUX_SPEED = 0.5; // radians a second, roughly - a wave every ~12s

// Shared by every pebble's materials, and by a dissolve's points, set each frame
export const pebbleFluxTime = { value: 0 };

export const PEBBLE_FLUX_GLSL = `
uniform float uFluxTime;
uniform float uFluxSeed;
uniform float uFluxAmount;

// Three slow waves over the pebble's surface, about -1..1
float pebbleFlux(vec3 n) {
    float t = uFluxTime;
    float s = uFluxSeed;
    return (sin(n.x * 2.3 + t + s) * cos(n.z * 2.1 - t * 0.73 + s * 1.3)
        + 0.6 * sin(n.y * 3.1 + n.x * 1.7 + t * 1.27 + s * 2.1)
        + 0.4 * cos(n.z * 2.7 - n.y * 1.9 - t * 0.91 + s * 0.7)) / 2.0;
}

// A point of the surface, moved by the waves
vec3 pebbleFluxed(vec3 p, vec3 n) {
    return p + n * pebbleFlux(normalize(p)) * uFluxAmount;
}`;

// How far a pebble of this size flexes, in world units - the dissolve's
// points need the same figure to start from the shape they were clicked on
export function fluxAmount(size) {
    return PEBBLE_RADIUS * size * PEBBLE_FLUX;
}

// Patches a pebble material (face or rim) to flux, on its own seed
export function addPebbleFlux(material, seed, size = 1) {
    const before = material.onBeforeCompile;

    material.onBeforeCompile = (shader, renderer) => {
        before?.(shader, renderer);
        shader.uniforms.uFluxTime = pebbleFluxTime;
        shader.uniforms.uFluxSeed = { value: seed };
        shader.uniforms.uFluxAmount = { value: fluxAmount(size) };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', [
                '#include <common>',
                PEBBLE_FLUX_GLSL,
                // Sent on for the face's colour to drift with (see
                // pebbles/gradient.js). The rim's fragment shader ignores it,
                // which is free.
                'varying float vPebbleFlux;',
            ].join('\n'))
            .replace('#include <begin_vertex>', [
                '#include <begin_vertex>',
                'float pebbleFluxHere = pebbleFlux(normalize(position));',
                'transformed += normal * pebbleFluxHere * uFluxAmount;',
                'vPebbleFlux = pebbleFluxHere;',
                // The moved surface's direction, from two points beside this one
                'vec3 pebbleSideA = normalize(cross(normal, abs(normal.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));',
                'vec3 pebbleSideB = cross(normal, pebbleSideA);',
                'float pebbleStep = 0.04 * length(position);',
                'vec3 pebbleNormal = normalize(cross(',
                '    pebbleFluxed(position + pebbleSideA * pebbleStep, normal) - transformed,',
                '    pebbleFluxed(position + pebbleSideB * pebbleStep, normal) - transformed));',
                'if (dot(pebbleNormal, normal) < 0.0) pebbleNormal = -pebbleNormal;',
            ].join('\n'));
    };

    const key = material.customProgramCacheKey?.() ?? '';
    material.customProgramCacheKey = () => `${key}|pebble-flux`;
    return material;
}

export function makePebbleGeometry(seed, size = 1) {
    let geometry = new THREE.IcosahedronGeometry(PEBBLE_RADIUS * size, PEBBLE_DETAIL);

    // Shared vertices, so the normals come out smooth rather than faceted
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    geometry = mergeVertices(geometry);

    const position = geometry.attributes.position;
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const stretchX = 1 + PEBBLE_STRETCH * Math.sin(seed * 3.1);
    const stretchZ = 1 + PEBBLE_STRETCH * Math.cos(seed * 1.7);

    for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        n.copy(v).normalize();

        // A few slow, overlapping waves over the sphere - a soft wobble, not noise
        const lump = Math.sin(n.x * 2.2 + seed) * Math.cos(n.y * 2.9 + seed * 1.7)
            + 0.6 * Math.sin(n.z * 3.7 + seed * 2.3) * Math.sin(n.x * 1.5 - seed)
            + 0.35 * Math.cos((n.x + n.z) * 4.6 + seed * 0.5);

        v.multiplyScalar(1 + PEBBLE_LUMPS * lump);
        position.setXYZ(i, v.x * stretchX, v.y * PEBBLE_SQUASH, v.z * stretchZ);
    }

    geometry.computeVertexNormals();
    return geometry;
}
