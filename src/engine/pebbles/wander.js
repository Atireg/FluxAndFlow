import { randomBetween } from '../constants.js';

/**
 * Ambient motion.
 *
 * Each pebble drifts slowly and independently instead of ticking through a
 * fixed bounce, so the grid reads as something flowing rather than
 * mechanical - the brief this project is named for. A single sine still
 * looks like a metronome no matter how its period is randomised; summing
 * two per axis, at different frequencies and phases, is a cheap stand-in
 * for noise that breaks that up without pulling in a dependency for it.
 */
const WANDER_Y_PERIOD_A = [8, 14]; // seconds per cycle
const WANDER_Y_PERIOD_B = [14, 24];
const WANDER_Y_AMPLITUDE_A = 1.4; // units
const WANDER_Y_AMPLITUDE_B = 0.6;
const WANDER_XZ_PERIOD = [9, 16];
const WANDER_XZ_AMPLITUDE = 0.38; // horizontal sway - well under half the gap between pebbles
const WANDER_TILT_PERIOD = [7, 12];
const WANDER_TILT = 0.05; // radians - a floating thing rocks a little as it drifts

export function createWander() {
    return {
        yA: { period: randomBetween(...WANDER_Y_PERIOD_A), phase: Math.random() * Math.PI * 2 },
        yB: { period: randomBetween(...WANDER_Y_PERIOD_B), phase: Math.random() * Math.PI * 2 },
        x: { period: randomBetween(...WANDER_XZ_PERIOD), phase: Math.random() * Math.PI * 2 },
        z: { period: randomBetween(...WANDER_XZ_PERIOD), phase: Math.random() * Math.PI * 2 },
        tiltX: { period: randomBetween(...WANDER_TILT_PERIOD), phase: Math.random() * Math.PI * 2 },
        tiltZ: { period: randomBetween(...WANDER_TILT_PERIOD), phase: Math.random() * Math.PI * 2 },
    };
}

export function wanderOffset(wander, elapsedTime) {
    const sine = (term) => Math.sin((elapsedTime / term.period) * Math.PI * 2 + term.phase);

    return {
        x: sine(wander.x) * WANDER_XZ_AMPLITUDE,
        y: sine(wander.yA) * WANDER_Y_AMPLITUDE_A + sine(wander.yB) * WANDER_Y_AMPLITUDE_B,
        z: sine(wander.z) * WANDER_XZ_AMPLITUDE,
        tiltX: sine(wander.tiltX) * WANDER_TILT,
        tiltZ: sine(wander.tiltZ) * WANDER_TILT,
    };
}

/**
 * Where a pebble sits while idle - shared with the grid's return after a
 * project closes, which places pebbles without touching their fading opacity.
 */
export function placeAtRest(pebble, elapsedTime) {
    const base = pebble.userData.slotPosition;
    const offset = wanderOffset(pebble.userData.wander, elapsedTime);
    pebble.position.set(base.x + offset.x, offset.y, base.z + offset.z);

    pebble.rotation.set(offset.tiltX, 0, offset.tiltZ);
    pebble.scale.setScalar(1);
}
