import { defineProject } from './schema.js';

/**
 * Future Gardens - a model that moves: the user's Rhino mechanism (mechanism.glb, made by
 * tools/models/mechanism.mjs from its two poses): five petals that open on
 * their hinges as the rack, driven by a small motor, slides. A slider over
 * the model plays it. The text is still to come from the user.
 */
export default defineProject({
    id: 'future-gardens',
    slot: 2,
    title: 'Future Gardens',
    category: 'teaching',

    thumbModel: 'models/mechanism.glb',
    thumbSize: 1.6,
    detailModel: 'models/mechanism.glb',
    // The model itself, each kind of part in its own look
    solid: { lit: [222, 222, 220], shade: [160, 160, 162] },
    parts: {
        petal: { lit: [176, 168, 210], shade: [112, 104, 150] },
        rack: { lit: [150, 196, 150], shade: [84, 128, 84] },
        frame: { lit: [236, 200, 96], shade: [170, 132, 40] },
        motor: { lit: [222, 222, 220], shade: [160, 160, 162] },
        screws: { lit: [204, 204, 202], shade: [168, 168, 168] },
    },
    // The petals turn, the rack slides: by itself, a cycle in 10 seconds, or by the slider
    mechanism: { loop: 10 },
    still: true,
    doubleClick: 'none',
    view: { elevation: 22, turn: 20, zoom: { side: 1.2, stacked: 1.5 } },
});
