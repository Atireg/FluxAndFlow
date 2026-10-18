import { defineProject } from './schema.js';

/**
 * kh-reuse - a laptop, a plain mesh (static/models/laptop.glb, lid open),
 * drawn as itself, standing still with its screen to the visitor. No drawer
 * text yet: it comes from the user.
 */
export default defineProject({
    id: 'kh-reuse',
    slot: 3,
    title: 'kh-reuse',
    // Research, teaching or the real world - its tag, and the catalog's filter
    category: 'real-world',

    // A small reuse sign in its pebble (static/models/reuse.glb, made in code)
    thumbModel: 'models/reuse.glb',
    thumbSize: 1.9,
    detailModel: 'models/laptop.glb',
    // The mesh itself rather than points, in light grey (screen [r, g, b],
    // where it faces the light and where it turns away), and no turn of its own
    solid: { lit: [222, 222, 220], shade: [160, 160, 162] },
    still: true,
    // ...and the visitor can't orbit it: the screen stays square on
    orbit: false,
    // The pebble's points settle onto the laptop's screen and float there
    // in the clouds' inks, over the film below
    screen: 'Screen',
    // The recorded film on the screen, under the points (muted, looping)
    screenVideo: 'videos/kh-reuse.mp4',
    // Square-on to the screen (the model's front is its +Z, which the
    // detail view's quarter turn would swing away), from a little above
    view: { elevation: 15, turn: -90, zoom: { side: 2.0, stacked: 1.15 }, lift: { side: -0.15, stacked: -0.05 } },
});
