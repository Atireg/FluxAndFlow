import * as THREE from 'three';

/**
 * Scene colours are given as the values they should show on screen. The
 * renderer outputs linear values straight to the screen, and a hex string
 * is converted towards linear on the way in, which darkens and shifts it -
 * so these bypass that. See DECISIONS.md.
 */
export const screenColor = (r, g, b) =>
    new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.LinearSRGBColorSpace);

/**
 * On the paper ground (--bg in styles.css): the pebbles are graphite - a
 * smooth graphite shade (see addGraphite) inside a graphite outline. They
 * were pale teal glass with teal rims, then pencil hatching, until the user
 * kept the colour and dropped the strokes
 */
export const PEBBLE_COLOR = screenColor(72, 72, 74);
export const PEBBLE_RIM_COLOR = screenColor(40, 40, 42);

/**
 * A pebble whose project has been opened stays darker, like a visited link:
 * deeper graphite and a darker rim. Remembered in the browser, so it's still
 * darker on the next visit (where storage is allowed - it's a nicety, not
 * state anything depends on).
 */
export const VISITED_PEBBLE_COLOR = screenColor(48, 48, 50);
export const VISITED_RIM_COLOR = screenColor(20, 20, 22);

/**
 * The spotlight's glow colour - the same orange as the drawer's pull
 * handle (--warm in styles.css), distinct from the graphite the grid
 * otherwise rests at, so a jumping pebble reads as "look at me" and not as
 * a different flavour of idle
 */
export const SPOTLIGHT_GLOW_COLOR = screenColor(255, 140, 50);

/**
 * The point clouds' inks: every point is given one of these at random when
 * its cloud loads, in these proportions - see the point cloud fragment shader
 */
export const POINT_INKS = [
    { color: screenColor(128, 24, 36), share: 1 / 3 }, // dark red
    { color: screenColor(255, 140, 50), share: 1 / 3 }, // orange - the invitation's
    { color: screenColor(120, 116, 110), share: 1 / 3 }, // warm grey
];

// Each point is also given one of these sizes at random, a third each - the
// middle one is the size every point used to be
export const POINT_SIZES = [0.6, 1, 1.6];

// How much ink a point lays down at most: semi-transparent, so overlapping
// points build up depth instead of a solid surface
export const POINT_OPACITY = 0.6;

// Graphite, like the pebbles: every thumbnail is drawn in this, whatever
// the file's own material, so the grid reads as one set
export const THUMB_INK_COLOR = screenColor(44, 44, 47);
