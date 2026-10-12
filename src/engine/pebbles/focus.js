import { PAPER_COLOR, THUMB_INK_COLOR } from '../colors.js';
import { smooth01 } from '../ease.js';

/**
 * The catalog's filter: bring one kind of project forward and sink the rest.
 * A pebble not of the chosen kind is pushed back along the line from the
 * overhead camera through it, until it looks FOCUS_SCALE of its size - so it
 * stays where it was on screen, only smaller - and fainter (`fadeFocus`,
 * FOCUS_INK of its graphite, the thumbnail fading into the paper) - so the
 * kind in focus stands out by being nearer and darker, not by a colour (one
 * orange means "click me"). Straight down was tried first: the camera's
 * perspective drew every sunk pebble in towards the middle, into a clump
 * behind the chosen ones. Sunk below the streams' plane, the streams run
 * over them. Choosing no kind brings every pebble back up.
 *
 * Like the arrival, it's laid over whatever a mode has placed, as a function
 * of time since the choice: each pebble keeps where it was heading from and
 * to (`userData.focus`), so changing the choice mid-move carries on from
 * where it got to rather than jumping.
 */
const FOCUS_SCALE = 0.5; // a sunk pebble looks this share of its size
const FOCUS_TIME = 1.4; // seconds to sink or rise
const FOCUS_INK = 0.35; // a sunk pebble keeps this share of its ink

// How far sunk a pebble is now, 0 (in focus) to 1 (fully sunk)
function sunk(pebble, elapsedTime) {
    const focus = pebble.userData.focus;
    if (!focus) return 0;

    return focus.from + (focus.to - focus.from) * smooth01((elapsedTime - focus.at) / FOCUS_TIME);
}

/**
 * Bring `category` forward (null for all of them): every pebble starts
 * towards its new depth from wherever it is now
 */
export function setFocus(state, pebbles, category, elapsedTime) {
    state.focus = category;
    pebbles.forEach((pebble) => {
        const to = category && pebble.userData.category !== category ? 1 : 0;
        pebble.userData.focus = { from: sunk(pebble, elapsedTime), to, at: elapsedTime };
    });
}

// Whether a pebble is in the kind brought forward (all are, with none chosen)
export function inFocus(state, pebble) {
    return !state.focus || pebble.userData.category === state.focus;
}

/**
 * After a mode has placed the pebble: push it back as far as it has got,
 * from the catalog's camera - straight above the grid's middle, `viewHeight`
 * up (framing.fitToGrid). Its distance grows by `reach`, so it looks
 * 1 / reach of its size where it was.
 */
export function applyFocus(pebble, viewHeight, elapsedTime) {
    const k = sunk(pebble, elapsedTime);
    if (k <= 0) return;

    const reach = 1 + k * (1 / FOCUS_SCALE - 1);
    pebble.position.x *= reach;
    pebble.position.z *= reach;
    pebble.position.y = viewHeight - (viewHeight - pebble.position.y) * reach;
}

/**
 * After the mode has painted the pebble: as faint as it has sunk. Only where
 * a mode sets the opacity every frame (catalog, dropping, returning) - it
 * multiplies, and would compound under the open project's fade-out tween.
 * The thumbnail is opaque, so it's mixed towards the paper instead; that's
 * set from scratch each time, so it never compounds.
 */
export function fadeFocus(pebble, elapsedTime) {
    const fade = sunk(pebble, elapsedTime) * (1 - FOCUS_INK);
    pebble.userData.contentInk?.color.copy(THUMB_INK_COLOR).lerp(PAPER_COLOR, fade);
    if (fade <= 0) return;

    pebble.material.opacity *= 1 - fade;
    pebble.userData.edges.material.opacity *= 1 - fade;
}
