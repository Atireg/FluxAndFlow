import * as THREE from 'three';
import {
    PEBBLE_COLOR,
    PEBBLE_RIM_COLOR,
    SPOTLIGHT_GLOW_COLOR,
    VISITED_PEBBLE_COLOR,
    VISITED_RIM_COLOR,
} from '../colors.js';
import { addPebbleFlux } from './geometry.js';
import { GRADIENT_APPLY_GLSL, GRADIENT_GLSL, TONE_GLSL, gradientTint } from './gradient.js';

/**
 * How a pebble is painted.
 *
 * The face is a graphite shade (see addGraphite), not lit glass: an unlit
 * material, its colour the graphite, its `emissive` the spotlight's orange,
 * and its opacity how heavily it's shaded. The rim is a fresnel-patched MeshBasicMaterial
 * standing in for a box's edge lines, driven through `.material.color` and
 * `.opacity` exactly as those were.
 *
 * Everything that changes a pebble's colour goes through paintGlow; never
 * write the resting colours back directly.
 */

// The face's shading at rest, and at the peak of a spotlight beat
const FACE_OPACITY = 0.14;
const SPOTLIGHT_FACE_OPACITY = 0.6;
const VISITED_FACE_OPACITY = 0.24;

const SPOTLIGHT_FACE_GLOW = 1.0; // how strongly the face glows orange at the peak of a beat
const SPOTLIGHT_FACE_DIM = 0.9; // how far the face's own lit colour drops out at that peak

const PEBBLE_RIM_POWER = 2.4; // how tightly the rim hugs the silhouette
const GRAPHITE_WEIGHT = 4; // the opacity times this is how much it shades (resting 0.14 -> 0.56)

/**
 * Graphite: a pebble's face shaded in graphite over the paper rather than
 * lit glass - the scene's cyan lights would tint it blue. Shaded from a
 * fixed light (upper left) and darker towards the silhouette, smoothly (it
 * was pencil hatching; the user kept the colour and dropped the strokes).
 * On an unlit material: it was a MeshStandardMaterial whose lighting was
 * worked out every frame and then thrown away for this shade.
 */
export function addGraphite(material) {
    // The spotlight's orange, as on a lit material: three.js copies
    // `emissive` x `emissiveIntensity` into a uniform of that name each frame
    // when the material has one - so the shader must have it too
    material.emissive = new THREE.Color(0, 0, 0);
    material.emissiveIntensity = 1;

    material.onBeforeCompile = (shader) => {
        shader.uniforms.uGradientTint = gradientTint;
        shader.uniforms.emissive = { value: new THREE.Color(0, 0, 0) };

        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vGraphiteNormal;')
            // The moved surface's direction (addPebbleFlux), in view space
            .replace('#include <project_vertex>', '#include <project_vertex>\nvGraphiteNormal = normalize(normalMatrix * pebbleNormal);');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>\nuniform vec3 emissive;\nvarying vec3 vGraphiteNormal;\n${GRADIENT_GLSL}`)
            .replace('#include <opaque_fragment>', [
                // Light from the upper left, darker towards the silhouette
                'vec3 graphiteNormal = normalize(vGraphiteNormal);',
                'float graphiteLit = dot(graphiteNormal, normalize(vec3(-0.45, 0.55, 0.7))) * 0.5 + 0.5;',
                'float graphiteEdge = 1.0 - abs(graphiteNormal.z);',
                'float graphiteDark = clamp((1.0 - graphiteLit) * 1.1 + graphiteEdge * 0.5, 0.0, 1.0);',
                // The warmth drifting with the pebble's shape waves. A
                // multiplier, so a face paintGlow has dimmed stays dimmed -
                // see pebbles/gradient.js.
                GRADIENT_APPLY_GLSL,
                // Graphite, turning the spotlight's orange as it glows, with a
                // light wash of it filling in at the peak
                'outgoingLight = diffuseColor.rgb + emissive;',
                // The material's own opacity, before the shading overwrites it
                'float graphiteOpacity = diffuseColor.a;',
                'float graphiteWash = smoothstep(0.15, 0.6, graphiteOpacity) * 0.35;',
                // ...and the same wave changing how heavily it is laid down.
                // Applied to the shaded term only, so the wash stays a floor.
                TONE_GLSL,
                `diffuseColor.a = max((0.15 + 0.45 * graphiteDark) * min(graphiteOpacity * ${GRAPHITE_WEIGHT.toFixed(1)}, 1.0) * pebbleBreath, graphiteWash);`,
                '#include <opaque_fragment>',
            ].join('\n'));
    };
    material.customProgramCacheKey = () => 'pebble-graphite';
    return material;
}

/**
 * The rim: plain colour and opacity like any basic material, its alpha
 * weighted towards the silhouette. Kept off pow(0, y), undefined in GLSL
 * (see "Safari" in DECISIONS.md).
 */
function makeRimMaterial(color) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false });

    material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vRimNormal;\nvarying vec3 vRimView;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvRimNormal = normalize(normalMatrix * pebbleNormal);\nvRimView = normalize(-mvPosition.xyz);');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vRimNormal;\nvarying vec3 vRimView;')
            .replace('#include <opaque_fragment>', [
                'float rimFacing = abs(dot(normalize(vRimNormal), normalize(vRimView)));',
                `diffuseColor.a *= pow(max(1.0 - rimFacing, 0.0001), ${PEBBLE_RIM_POWER.toFixed(2)});`,
                '#include <opaque_fragment>',
            ].join('\n'));
    };
    material.customProgramCacheKey = () => 'pebble-rim';

    return material;
}

/**
 * A pebble's two materials, both fluxing on the same seed so the rim stays
 * on the face. One place, so a new pebble can never be built with half the
 * treatment.
 */
export function makePebbleMaterials(seed, size) {
    const face = addPebbleFlux(addGraphite(new THREE.MeshBasicMaterial({
        color: PEBBLE_COLOR,
        transparent: true,
        opacity: FACE_OPACITY,
    })), seed, size);

    const rim = addPebbleFlux(makeRimMaterial(PEBBLE_RIM_COLOR), seed, size);

    return { face, rim };
}

/**
 * What a pebble rests at - every state that returns a pebble to rest, or
 * glows from rest, starts from these. A visited pebble rests darker.
 */
export function restingFaceColor(pebble) {
    return pebble.userData.visited ? VISITED_PEBBLE_COLOR : PEBBLE_COLOR;
}

export function restingFaceOpacity(pebble) {
    return pebble.userData.visited ? VISITED_FACE_OPACITY : FACE_OPACITY;
}

export function restingRimColor(pebble) {
    return pebble.userData.visited ? VISITED_RIM_COLOR : PEBBLE_RIM_COLOR;
}

const glowFaceColor = new THREE.Color(); // reused each frame, never reallocated
const glowRimColor = new THREE.Color();

/**
 * A pebble's colours for how orange the spotlight has made it, 0..1. At 0
 * it's its resting self. The face glows through its `emissive` colour, added
 * over its base colour (addGraphite) - which is dimmed as the glow rises, or
 * the grey washes the orange out to tan.
 */
export function paintGlow(pebble, amount, rimOpacity = 1) {
    const restOpacity = restingFaceOpacity(pebble);
    pebble.material.opacity = restOpacity + (SPOTLIGHT_FACE_OPACITY - restOpacity) * amount;
    pebble.material.color.copy(restingFaceColor(pebble)).multiplyScalar(1 - amount * SPOTLIGHT_FACE_DIM);
    glowFaceColor.copy(SPOTLIGHT_GLOW_COLOR).multiplyScalar(amount * SPOTLIGHT_FACE_GLOW);
    pebble.material.emissive.copy(glowFaceColor);

    glowRimColor.copy(restingRimColor(pebble)).lerp(SPOTLIGHT_GLOW_COLOR, amount);
    pebble.userData.edges.material.color.copy(glowRimColor);
    pebble.userData.edges.material.opacity = rimOpacity;
}

// Back to plain resting paint, with no glow left to show through a fade
export function paintResting(pebble) {
    pebble.material.opacity = restingFaceOpacity(pebble);
    pebble.material.color.copy(restingFaceColor(pebble));
    pebble.material.emissive.setRGB(0, 0, 0);
    pebble.userData.edges.material.opacity = 1;
    pebble.userData.edges.material.color.copy(restingRimColor(pebble));
}
