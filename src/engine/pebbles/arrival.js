import { easeOutBack, smooth01 } from '../ease.js';
/**
 * The arrival: whenever the grid comes into view - as the start-up loader
 * leaves, and on the way back from a project - each pebble surfaces out of
 * the paper on its own beat, growing and clearing from nothing, rather than
 * the whole grid appearing at once. A pure function of the time since it
 * began, laid over whatever the pebble's mode has set.
 *
 * It multiplies opacity and scale - the content's too - AFTER the mode has
 * set them, so whatever a mode leaves unset must be reset by that mode
 * first, or it compounds.
 */
const ARRIVAL_DURATION = 3.2; // seconds for one pebble to arrive - 1.6 was too fast
const ARRIVAL_STAGGER = 2.4; // seconds - the latest any pebble sets off
const ARRIVAL_SMALLEST = 0.35; // the size it surfaces at, as a share of its own
const ARRIVAL_DEPTH = 4; // units below its place it rises from

// Then what's inside them - the rock, a project's model - one by one, in a
// random order, once the pebbles have mostly surfaced
const CONTENT_ARRIVAL_AFTER = 3.2; // seconds from the arrival's start to the first
const CONTENT_ARRIVAL_STEP = 0.35; // seconds between one and the next
const CONTENT_ARRIVAL_DURATION = 0.7; // seconds for each to grow in

// The grid surfaces as the loader starts to leave - or at once, should
// there be no loader
export const ARRIVAL_AFTER_LOADER = 0; // seconds into the loader's fade - they surface as it clears

/**
 * The grid's arrival begins, each pebble on a beat of its own.
 */
export function startArrival(state, pebbles, at) {
    state.arrivalStartedAt = at;

    const order = pebbles.map((pebble, i) => i).sort(() => Math.random() - 0.5);

    pebbles.forEach((pebble, i) => {
        pebble.userData.arrivalDelay = Math.random() * ARRIVAL_STAGGER;
        pebble.userData.contentArrivalDelay = CONTENT_ARRIVAL_AFTER + order[i] * CONTENT_ARRIVAL_STEP;
    });
}

// How far a pebble's content has grown in, 0..1, overshooting a touch
function contentArrivalOf(pebble, startedAt, elapsedTime) {
    return easeOutBack((elapsedTime - startedAt - (pebble.userData.contentArrivalDelay ?? 0)) / CONTENT_ARRIVAL_DURATION);
}

// How far a pebble has arrived, 0..1, eased at both ends: it sets off from
// rest and settles. Eased out only, it started at its fastest - a jump
// rather than a rise, noticed as the loader cleared
function arrivalOf(pebble, startedAt, elapsedTime) {
    return smooth01((elapsedTime - startedAt - (pebble.userData.arrivalDelay ?? 0)) / ARRIVAL_DURATION);
}

// On top of the pebble's mode: smaller, lower and fainter until it's here
export function applyArrival(pebble, startedAt, elapsedTime) {
    const content = pebble.userData.content;
    if (content) {
        const grown = contentArrivalOf(pebble, startedAt, elapsedTime);
        content.visible = grown > 0.01;
        if (grown !== 1) content.scale.multiplyScalar(Math.max(grown, 0.001));
    }

    const k = arrivalOf(pebble, startedAt, elapsedTime);
    // Only once it's mostly there does it hide the streams passing under it
    pebble.material.depthWrite = k > 0.3;
    if (k >= 1) return;

    pebble.scale.multiplyScalar(ARRIVAL_SMALLEST + (1 - ARRIVAL_SMALLEST) * k);
    pebble.position.y -= (1 - k) * ARRIVAL_DEPTH;
    pebble.material.opacity *= k;
    pebble.userData.edges.material.opacity *= k;
}
