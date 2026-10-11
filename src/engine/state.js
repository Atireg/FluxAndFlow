/**
 * The engine's shared mutable state - what used to be a dozen top-level
 * `let`s in the old script.js. One object, so the parts that genuinely have to agree
 * about it (the catalog, the detail view, the camera, the tags) read the
 * same thing rather than passing copies around, and so what is mutable is
 * listed in one place.
 */
export function createState() {
    return {
        /**
         * 'catalog' | 'dropping' (the send-off after a click, before the
         * camera moves) | 'detail' | 'returning' (closing, until the grid
         * has faded back in)
         */
        view: 'catalog',

        selected: null, // the pebble whose project is open, in detail view
        hovered: null, // the pebble under the cursor, in the catalog

        drawerOpen: false,

        // Whether a double-click/tap has zoomed in on the model. Any
        // re-framing (drawer, resize, a new project) clears it.
        detailZoomed: false,

        // The send-off after a click - see detail.js
        droppingFrom: null,
        dropStartedAt: -Infinity,

        // The grid's arrival - hidden until the loader leaves
        arrivalStartedAt: Infinity,

        // One pebble at a time glows orange and jumps - see catalog.js
        spotlight: {
            pebble: null,
            last: null, // excluded from the next pick, so it moves on
            startedAt: 0,
            rotatePeriodX: 0,
            rotatePeriodZ: 0,
            nextAt: 0,
        },

        // "Still empty..." on a slot that was just clicked
        emptyTag: { pebble: null, shownAt: 0 },

        // Seconds into the model's showing before the next double-tap hint
        tapHintNext: Infinity,
    };
}
