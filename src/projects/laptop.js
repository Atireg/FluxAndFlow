import { defineProject } from './schema.js';

/**
 * A laptop - a plain mesh (static/models/laptop.glb, lid open), sampled into
 * points as it opens. The name is a working one and there is no drawer text
 * yet: both come from the user.
 */
export default defineProject({
    id: 'laptop',
    slot: 3,
    title: 'Laptop',
    // Research, teaching or the real world - its tag, and the catalog's filter
    category: 'real-world',

    // Its own mesh in its pebble, like Emergent Space's
    thumbModel: 'models/laptop.glb',
    thumbSize: 1.9,
    // A plain mesh, not a point cloud: its surface is sampled into points
    // as it loads (see pointsFromMeshes)
    detailModel: 'models/laptop.glb',
    // Seen from a little above and turned three-quarters, so the keys and
    // the screen both read
    view: { elevation: 28, turn: 35, zoom: { side: 1.3, stacked: 1.1 } },
    gather: true,
});
