import { randomBetween } from '../constants.js';
import { inFocus } from './focus.js';
import { paintGlow } from './materials.js';
import { wanderOffset } from './wander.js';
import { smooth01 } from '../ease.js';

/**
 * The spotlight.
 *
 * One pebble at a time, continuously: holds where it floated, jumps - a
 * quick rock on two axes, a lift and a scale pulse on both the pebble and
 * its thumbnail, rim blinking graphite to orange - for a fixed dwell,
 * settles, and hands off to another a beat later. Every pebble is fair game,
 * project or empty: this is the grid feeling alive, not only an invitation
 * to click a project, though it still reads as exactly that where one
 * exists. Never the pebble under the cursor, and never the one that just
 * finished, so it visibly moves rather than occasionally repeating itself.
 */
const SPOTLIGHT_GAP = [0.3, 0.6]; // seconds between one settling and the next starting
const SPOTLIGHT_DWELL = 5; // seconds a pebble stays spotlighted
const SPOTLIGHT_FADE_IN = 0.6; // seconds to ramp the effect in at the start of the dwell
const SPOTLIGHT_FADE_OUT = 1.6; // and to settle back into the float at the end - slower, so it eases home
const SPOTLIGHT_PULSE_PERIOD = 1.1; // seconds per jump
const SPOTLIGHT_ROTATE_PERIOD = [1.0, 1.4]; // seconds; x and z rock at different rates
const SPOTLIGHT_ROTATE_AMPLITUDE = 0.14; // radians, ~8 degrees
const SPOTLIGHT_SCALE_AMPLITUDE = 0.18; // the thumbnail scales +/- 18% at the peak of each jump
const SPOTLIGHT_PEBBLE_SCALE_AMPLITUDE = 0.14; // the pebble itself, kept well clear of its neighbours
const SPOTLIGHT_JUMP_HEIGHT = 0.4; // units lifted at the peak of each jump
// None until the grid has surfaced (pebbles/arrival.js): it ran behind the
// loader, and whichever pebble was glowing popped in lit, name and all, the
// moment the loader cleared
const SPOTLIGHT_AFTER_ARRIVAL = 3; // seconds from the arrival's start, on its own clock

// The name's opacity at the low of each blink, relative to the spotlight's
// strength - a pulse, never faint
export const SPOTLIGHT_TAG_MIN = 0.65;

/**
 * Ramp the whole effect in, and back out, rather than popping into a fast
 * rock on the first frame and snapping to rest the instant the dwell ends -
 * this is what makes it settle rather than just stop. Eased at both ends
 * (smoothstep), so it neither starts nor lands with a jolt.
 */
// Seconds since the current spotlight began
function spotlightSince(state, elapsedTime) {
    return elapsedTime - state.spotlight.startedAt;
}

// The jump's beat, -1..1
function spotlightPulse(state, elapsedTime) {
    return Math.sin((spotlightSince(state, elapsedTime) / SPOTLIGHT_PULSE_PERIOD) * Math.PI * 2);
}

function spotlightRamp(state, elapsedTime) {
    const since = spotlightSince(state, elapsedTime);
    const fadeIn = Math.min(since / SPOTLIGHT_FADE_IN, 1);
    const fadeOut = Math.min((state.spotlight.dwell - since) / SPOTLIGHT_FADE_OUT, 1);
    return Math.max(0, Math.min(fadeIn, fadeOut));
}

export function spotlightIntensity(state, elapsedTime) {
    return smooth01(spotlightRamp(state, elapsedTime));
}

// How far through the current jump the spotlight is, 0..1 - the beat the
// pebble's glow and its name both blink on
export function spotlightGlow(state, elapsedTime) {
    return (spotlightPulse(state, elapsedTime) + 1) / 2;
}

export function poseSpotlightPebble(pebble, state, elapsedTime) {
    const since = spotlightSince(state, elapsedTime);
    const intensity = spotlightIntensity(state, elapsedTime);

    const pulse = spotlightPulse(state, elapsedTime);
    const glow = (pulse + 1) / 2; // 0..1
    const lift = Math.max(0, pulse); // only the upward half of each beat

    /**
     * Holds where its float had it when the spotlight began, rather than
     * also wandering, lifted on the upward half of each beat - a jump, not a
     * drift - amid the others around it. Blended with the live float by the
     * same intensity, so it leaves its drift and rejoins it without a snap:
     * the float has moved on during the dwell, and the fade-out glides it
     * there.
     */
    const base = pebble.userData.slotPosition;
    const held = wanderOffset(pebble.userData.wander, state.spotlight.startedAt);
    const live = wanderOffset(pebble.userData.wander, elapsedTime);
    const mix = (from, to) => from + (to - from) * intensity;
    pebble.position.set(
        base.x + mix(live.x, held.x),
        mix(live.y, held.y) + lift * SPOTLIGHT_JUMP_HEIGHT * intensity,
        base.z + mix(live.z, held.z),
    );

    const rock = (period, phase) => Math.sin((since / period) * Math.PI * 2 + phase) * SPOTLIGHT_ROTATE_AMPLITUDE;
    pebble.rotation.set(
        mix(live.tiltX, rock(state.spotlight.rotatePeriodX, 0)),
        0,
        mix(live.tiltZ, rock(state.spotlight.rotatePeriodZ, 1.7)),
    );
    pebble.scale.setScalar(1 + pulse * SPOTLIGHT_PEBBLE_SCALE_AMPLITUDE * intensity);

    // Blink the whole pebble - face and rim alike - between its resting
    // colours and the orange, the rim never fully off so it reads as
    // glowing rather than flickering
    paintGlow(pebble, glow * intensity, 1 - intensity * 0.35 * (1 - glow));

    if (pebble.userData.content) {
        const contentScale = pebble.userData.contentBaseScale * (1 + pulse * SPOTLIGHT_SCALE_AMPLITUDE * intensity);
        pebble.userData.content.scale.setScalar(contentScale);
    }
}

/**
 * Any pebble is fair game, project or empty. Never the one already under the
 * cursor, and not the one that just finished, so it visibly moves on rather
 * than occasionally repeating itself.
 */
function pickSpotlight(state, all) {
    // With one kind brought forward, only among those (pebbles/focus.js);
    // none at all when every pebble is sunk (the page's path view)
    const pebbles = all.filter((pebble) => inFocus(state, pebble));
    const withoutRepeat = pebbles.filter(
        (pebble) => pebble !== state.hovered && pebble !== state.spotlight.last
    );
    const candidates = withoutRepeat.length
        ? withoutRepeat
        : pebbles.filter((pebble) => pebble !== state.hovered);

    if (!candidates.length) return null;

    return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * The dwell/gap timers are set against the clock, so they self-correct once
 * the catalog resumes however long detail view was open for - nothing needs
 * pausing or resetting on the way in or out.
 */
export function updateSpotlightCycle(state, pebbles, elapsedTime) {
    const spotlight = state.spotlight;

    if (state.arrivalTime < SPOTLIGHT_AFTER_ARRIVAL) {
        spotlight.pebble = null;
        spotlight.nextAt = Math.max(spotlight.nextAt, elapsedTime);
        return;
    }

    if (spotlight.pebble) {
        /**
         * Runs its whole dwell, hovered or not - hover changes nothing. But
         * once the filter has brought another kind forward, only that kind
         * jumps: a pebble of any other settles now, easing out from wherever
         * its glow had got to (its dwell shortened so the fade-out picks up
         * at the same strength) rather than snapping off
         */
        if (!inFocus(state, spotlight.pebble) && !spotlight.cut) {
            spotlight.cut = true;
            const since = spotlightSince(state, elapsedTime);
            spotlight.dwell = Math.min(spotlight.dwell, since + spotlightRamp(state, elapsedTime) * SPOTLIGHT_FADE_OUT);
        }

        if (spotlightSince(state, elapsedTime) > spotlight.dwell) {
            spotlight.last = spotlight.pebble;
            spotlight.pebble = null;
            spotlight.nextAt = elapsedTime + randomBetween(...SPOTLIGHT_GAP);
        }

        return;
    }

    if (elapsedTime < spotlight.nextAt) return;

    const pebble = pickSpotlight(state, pebbles);

    if (!pebble) {
        // Nothing eligible right now - e.g. a one-pebble grid with that one
        // pebble under the cursor. Try again shortly rather than every frame.
        spotlight.nextAt = elapsedTime + randomBetween(...SPOTLIGHT_GAP);
        return;
    }

    spotlight.pebble = pebble;
    spotlight.startedAt = elapsedTime;
    spotlight.dwell = SPOTLIGHT_DWELL;
    spotlight.cut = false;
    spotlight.rotatePeriodX = randomBetween(...SPOTLIGHT_ROTATE_PERIOD);
    spotlight.rotatePeriodZ = randomBetween(...SPOTLIGHT_ROTATE_PERIOD);
}

export function initSpotlightCycle(state) {
    state.spotlight.nextAt = randomBetween(...SPOTLIGHT_GAP);
}
