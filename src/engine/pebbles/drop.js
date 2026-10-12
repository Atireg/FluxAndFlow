import { paintResting, restingFaceOpacity } from './materials.js';
import { DISSOLVE_FADE } from './dissolve.js';
import { clamp01 } from '../ease.js';

/**
 * The send-off after a project is clicked: a boom - one shockwave out from
 * the chosen pebble that knocks every other pebble outward and up towards
 * the camera in an instant - then a moment's hang, then a slow fall down the
 * screen, out past the bottom edge, while the chosen one holds still. No
 * oscillation and no rotation anywhere. The camera starts moving in while
 * they're still falling. Like the rest of the catalog's motion it's a pure
 * function of the clock - here, time since the click.
 */
const BOOM_PUSH = 3; // units each pebble is knocked out, away from the chosen one
const BOOM_LIFT = 4; // units each pebble is knocked up towards the camera
const BOOM_SNAP = 0.07; // seconds - time constant of the knock; ~0.2s to all but arrive
const BOOM_WAVE = 0.006; // seconds for the shockwave to travel one unit
const BOOM_HANG = 0.3; // seconds after the click before the pebbles start to fall
const DROP_STAGGER = 0.2; // seconds - pebbles let go at slightly different moments
const DROP_FALL = 1.4; // seconds to fall off the screen
const DROP_DISTANCE = 75; // units down the screen - clears it at any aspect
const DROP_SINK = 0.15; // share of the fall that also sinks away from the camera

// Seconds into the fall that the camera starts moving in. Partway through
// rather than after it, so the camera's move follows straight on from it.
export const DROP_OPEN_AFTER = 0.65;
export const DROP_BOOM_HANG = BOOM_HANG;

// Each pebble's share of the boom, fixed at the moment of the click
export function armDrop(pebbles, chosen) {
    pebbles.forEach((other) => {
        // Out along the screen, away from the chosen pebble
        const away = other.position.clone().sub(chosen.position).setY(0);

        other.userData.drop = {
            from: other.position.clone(),
            delay: Math.random() * DROP_STAGGER,
            lag: away.length() * BOOM_WAVE,
            away: away.lengthSq() > 0 ? away.normalize() : away,
        };
    });
}

export function dropInProgress(state, elapsedTime) {
    return elapsedTime - state.dropStartedAt < BOOM_HANG + DROP_STAGGER + DROP_FALL;
}

/**
 * Pose only, no material - this part carries on after the project opens,
 * which is fading the pebbles out while they finish falling.
 */
export function placeDroppingPebble(pebble, state, elapsedTime) {
    const { from, delay, lag, away } = pebble.userData.drop;

    // The chosen pebble holds still where it was clicked
    if (pebble === state.droppingFrom) {
        pebble.position.copy(from);
        pebble.rotation.set(0, 0, 0);
        pebble.scale.setScalar(1);
        return;
    }

    const t = elapsedTime - state.dropStartedAt;

    // Gravity: distance grows with the square of time since letting go.
    // Down the screen is world +Z from the catalog's overhead camera; the
    // slight sink away from it also keeps falling pebbles behind the chosen one
    const fall = clamp01((t - BOOM_HANG - delay) / DROP_FALL);
    const drop = fall ** 2;

    // The boom: a single knock out from the chosen pebble and up towards the
    // camera (the pebble grows as it rises), arriving at once and settling
    // exponentially - fast, then dead still, no bounce. The shockwave
    // reaches pebbles further from the chosen one a few hundredths later.
    const sinceHit = Math.max(t - lag, 0);
    const knock = 1 - Math.exp(-sinceHit / BOOM_SNAP);

    pebble.position.set(
        from.x + away.x * BOOM_PUSH * knock,
        // The lift gives way as the pebble falls, so it passes behind the chosen one
        from.y + BOOM_LIFT * knock * (1 - fall) - DROP_SINK * DROP_DISTANCE * drop,
        from.z + away.z * BOOM_PUSH * knock + DROP_DISTANCE * drop,
    );

    // Square and straight all the way down - no tumble, no sideways drift
    pebble.rotation.set(0, 0, 0);
    pebble.scale.setScalar(1);
}

// Pose and paint, while the catalog is still what's on screen
export function updateDroppingPebble(pebble, state, elapsedTime) {
    paintResting(pebble);
    if (pebble.userData.content) pebble.userData.content.scale.setScalar(pebble.userData.contentBaseScale);

    // The clicked pebble's face, rim and rock give way to its dissolve
    if (pebble === state.droppingFrom) {
        const fade = 1 - Math.min((elapsedTime - state.dropStartedAt) / DISSOLVE_FADE, 1);
        pebble.material.opacity = restingFaceOpacity(pebble) * fade;
        pebble.userData.edges.material.opacity = fade;
        if (pebble.userData.content) {
            pebble.userData.content.scale.setScalar(pebble.userData.contentBaseScale * fade);
        }
    }

    placeDroppingPebble(pebble, state, elapsedTime);
}
