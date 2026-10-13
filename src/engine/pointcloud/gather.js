import * as THREE from 'three';
import { smooth01 } from '../ease.js';

/**
 * The gather (a project's `gather: true`): every point starts somewhere in a
 * loose cloud around the model and spirals in to its own place, at its own
 * moment, over GATHER_DURATION - the model condensing out of scattered
 * points. Done in the vertex shader from two extra attributes, a start
 * position and a delay, so it costs nothing per frame beyond one uniform.
 */
export const GATHER_DURATION = 5.4; // seconds from opening the project to the last point home - 3.6 felt rushed
export const GATHER_MAX_STEP = 0.1; // seconds the gather moves on in one frame, at most - a longer stall holds it rather than jumping it
export const GATHER_SPREAD = 0.4; // share of that over which points set off
export const GATHER_SWIRL = 2.4; // radians the scatter turns through on the way in
const GATHER_SCATTER = 1.5; // scatter radius, as a multiple of the model's own half-width

export const GATHER_TRAIL = 0.15; // seconds back a gathering point's tail reaches - 0.3 read as too long

/**
 * The handover from the clicked pebble's dissolve to the project's own
 * cloud: over this long from the moment the project's points appear, they
 * fade in while the dissolve's fade out, so the two clouds never sit on top
 * of each other at full strength.
 */
const REVEAL_DURATION = 1; // seconds

export function revealAt(since) {
    return smooth01(since / REVEAL_DURATION);
}

export function setReveal(model, reveal) {
    model.userData.pointMaterials?.forEach((material) => {
        material.uniforms.uReveal.value = reveal;
    });
}

export function setGather(model, progress) {
    // A cloud loaded without gather attributes would fly in from its origin
    if (!model.userData.gathers) return;

    model.userData.pointMaterials?.forEach((material) => {
        material.uniforms.uGather.value = progress;
    });
    // Tails while anything is still on its way
    model.userData.trails?.forEach((trails) => { trails.visible = progress < 1; });
}

// Somewhere in a flattened ball around the model, in the cloud's own space
export function addGatherAttributes(geometry) {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = (Math.max(size.x, size.z) / 2) * GATHER_SCATTER;

    const count = geometry.attributes.position.count;
    const scatter = new Float32Array(count * 3);
    const delay = new Float32Array(count);
    const direction = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
        direction.randomDirection().multiplyScalar(radius * Math.cbrt(Math.random()));
        scatter[i * 3] = center.x + direction.x;
        scatter[i * 3 + 1] = center.y + direction.y * 0.55;
        scatter[i * 3 + 2] = center.z + direction.z;
        delay[i] = Math.random();
    }

    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geometry.setAttribute('aGatherDelay', new THREE.BufferAttribute(delay, 1));
}
