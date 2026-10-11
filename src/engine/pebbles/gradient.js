import * as THREE from 'three';
import { PEBBLE_COLOR, screenColor } from '../colors.js';

/**
 * The colour drifting across a pebble's face.
 *
 * Each pebble's warmth follows its own shape waves, so it is never quite
 * still and no two pebbles are the same shade at the same moment - ten
 * stones in slowly-changing tones rather than ten identical grey ones.
 * Chosen from five options previewed behind a `?pebbles=` flag, now gone;
 * the rest are under "Tried and removed" in DECISIONS.md.
 *
 * Two things to know before touching this:
 *
 * 1. **A pebble's tone is in its alpha, not its colour.** `addGraphite`
 *    keeps `outgoingLight` one flat colour and varies `diffuseColor.a` -
 *    how heavily the pebble is laid down over the paper - which is what
 *    makes it read as pencil rather than as a lit solid. This only changes
 *    which colour is laid down; the shading rides on top, untouched.
 *
 * 2. **It is a multiplier, not a colour to mix to.** `paintGlow` dims the
 *    face's own colour to a tenth as the spotlight's orange rises (or the
 *    scene's cyan lights turn that orange green), and a visited pebble
 *    rests darker. Mixing towards an absolute colour would undo both -
 *    at the peak of a glow it put a brown back over a face that is
 *    supposed to have dropped out. Scaling the colour instead composes
 *    with anything that dims it.
 */

/**
 * Where the warmth goes: a sienna, sitting between the point clouds' dark
 * red and warm grey in hue, so the catalog and the project view read as one
 * set. Deliberately not orange (one orange means "click me") and not teal
 * ("the blue isn't right") - see DECISIONS.md.
 *
 * It has to be this far from graphite to be seen at all. A pebble is laid
 * down at an alpha of roughly 0.27, so only about a quarter of whatever is
 * chosen here reaches the screen - the rest is paper showing through. The
 * first attempt used a brown-grey (92, 74, 62), which moved the ink a long
 * way and the picture by about one count: invisible. Green is left nearly
 * alone on purpose; dropping it (towards the dark red) turns the warmth
 * pink rather than brown.
 */
const WARM = screenColor(138, 80, 48);

// How warm a pebble gets at the crest of a wave. Together with WARM this
// swings the on-screen warmth (R-B) by about 21 counts between trough and
// crest, against 7 for the first attempt. Dial this down first if it reads
// as too much.
const AMOUNT = 0.85;

/**
 * The tint as a ratio against the resting graphite, so multiplying by it at
 * full strength lands exactly on WARM and multiplying a dimmed face by it
 * keeps it dimmed.
 */
export const gradientTint = {
    value: new THREE.Vector3(
        WARM.r / PEBBLE_COLOR.r,
        WARM.g / PEBBLE_COLOR.g,
        WARM.b / PEBBLE_COLOR.b,
    ),
};

/**
 * Spliced into the graphite patch, after it has worked out its shading
 * terms and before the colour is laid down. `vPebbleFlux` is the shape wave
 * at this point, about -1..1, sent on by `addPebbleFlux`.
 *
 * Kept inside defined GLSL - no reversed smoothstep, no pow(0, y) - since
 * Safari can't be tested here (see DECISIONS.md, "Safari").
 */
export const GRADIENT_GLSL = [
    'uniform vec3 uGradientTint;',
    'varying float vPebbleFlux;',
].join('\n');

export const GRADIENT_APPLY_GLSL = [
    `float pebbleWarmth = ${AMOUNT.toFixed(2)} * clamp(vPebbleFlux * 0.5 + 0.5, 0.0, 1.0);`,
    'diffuseColor.rgb *= mix(vec3(1.0), uGradientTint, pebbleWarmth);',
].join('\n');
