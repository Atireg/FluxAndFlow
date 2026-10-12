/**
 * The grid's own dimensions - the few numbers that more than one part of the
 * engine has to agree on. Everything else lives next to the code it tunes:
 *
 *   pebbles/wander.js    the float
 *   pebbles/flow.js      the pointer's stir, and the bumps
 *   pebbles/arrival.js   the grid surfacing as the loader clears
 *   pebbles/spotlight.js the orange glow and jump
 *   pebbles/focus.js     the filter's sinking of the other kinds
 *   pebbles/materials.js how heavily a pebble is shaded, and how it glows
 *   pebbles/geometry.js  a pebble's shape, and its flux
 *   pebbles/dissolve.js  the clicked pebble giving way to points
 *   pointcloud/gather.js the gather, and the tails
 *   camera/rig.js        the lenses, and the point size in world units
 *   camera/framing.js    the margins, the sway, the detail rotation
 *   catalog.js           the thumbnails
 *   detail.js            the send-off, the double-tap zoom, the tap hint
 *   tags.js              the name's rope and its wind
 *   pile.js              the physics drop
 *   streams.js           the streams
 */

// The pebble grid's unit. The objects are smooth, flattened stones rather
// than boxes - the code still calls them pebbles, and they still sit in a
// cubeSize grid.
export const CUBE_SIZE = 5;
export const SPACING = 1.4; // centre to centre, in CUBE_SIZEs - 1.2 felt crowded

export const PEBBLE_RADIUS = CUBE_SIZE * 0.44;
export const PEBBLE_SQUASH = 0.62; // height as a share of width - a stone lying flat

// Each pebble is drawn this many times PEBBLE_RADIUS across, picked at
// random on every visit - the larger ones can reach into their neighbours
export const PEBBLE_SIZE_MIN = 1;
export const PEBBLE_SIZE_MAX = 1.8;

// A mesh sampled into points is centred and scaled to this longest side,
// since it comes in whatever units it was drawn in
export const MESH_FIT_SIZE = CUBE_SIZE;

export function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}
