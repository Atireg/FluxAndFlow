/**
 * The few curves the engine eases things with, on 0..1 - shared so each
 * fade, ramp and move doesn't spell its own out
 */

// Held to 0..1
export function clamp01(x) {
    return Math.min(Math.max(x, 0), 1);
}

// Smoothstep: starts and ends softly (clamped first, so any input will do)
export function smooth01(x) {
    const t = clamp01(x);
    return t * t * (3 - 2 * t);
}

// Fast, then settling to a stop
export function easeOutCubic(x) {
    const rest = 1 - clamp01(x);
    return 1 - rest * rest * rest;
}

// Settling with a small overshoot past 1 first, `back` setting how far
export function easeOutBack(x, back = 1.7) {
    const k = clamp01(x) - 1;
    return 1 + (back + 1) * k ** 3 + back * k ** 2;
}
