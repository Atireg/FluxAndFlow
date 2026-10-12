/**
 * The catalog's filter: bring one kind of project forward and sink the rest.
 * A pebble not of the chosen kind is pushed back along the line from the
 * overhead camera through it, until it looks FOCUS_SCALE of its size - so it
 * stays where it was on screen, only smaller, and the kind in focus stands
 * out by being nearer, not by a colour (one orange means "click me", and the
 * graphite holds the rest). Straight down was tried first: the camera's
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

function eased(t) {
    return t * t * (3 - 2 * t);
}

// How far sunk a pebble is now, 0 (in focus) to 1 (fully sunk)
function sunk(pebble, elapsedTime) {
    const focus = pebble.userData.focus;
    if (!focus) return 0;

    const t = Math.min(Math.max((elapsedTime - focus.at) / FOCUS_TIME, 0), 1);
    return focus.from + (focus.to - focus.from) * eased(t);
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
