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

    // Its own mesh in its pebble, like Emergent Space's
    thumbModel: 'models/laptop.glb',
    thumbSize: 1.9,
    detailModel: 'models/laptop.glb',
    // The mesh itself in the inks rather than points, and no turn of its own
    solid: true,
    still: true,
    // Square-on to the screen (the model's front is its +Z, which the
    // detail view's quarter turn would swing away), from a little above
    view: { elevation: 15, turn: -90, zoom: { side: 1.3, stacked: 1.1 } },
});
