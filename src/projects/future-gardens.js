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
    // A small orange line under its name, while the rest is still to come
    notice: 'under construction',

    thumbModel: 'models/mechanism.glb',
    thumbSize: 1.6,
    detailModel: 'models/mechanism.glb',
    // The model itself, each kind of part in its own look
    solid: { lit: [222, 222, 220], shade: [160, 160, 162] },
    // Clear acrylic as in the user's photo: see-through, every part outlined but the rack; the motor dark
    parts: {
        petal: { lit: [244, 242, 255], shade: [196, 190, 228], opacity: 0.3, edges: true },
        rack: { lit: [236, 244, 238], shade: [150, 190, 160], opacity: 0.5 },
        frame: { lit: [244, 242, 255], shade: [160, 154, 204], opacity: 0.45, edges: true },
        motor: { lit: [96, 96, 104], shade: [44, 44, 50], edges: true },
        screws: { lit: [214, 214, 220], shade: [160, 160, 170], edges: true },
    },
    // The petals turn, the rack slides: by itself, a cycle in 10 seconds, or by the slider
    mechanism: {
        loop: 10,
        // Cloth between the petals, glowing lavender as in the photo
        cloth: { of: 'petal', lit: [236, 230, 255], shade: [176, 160, 236], opacity: 0.62 },
    },
    still: true,
    doubleClick: 'none',
    view: { elevation: 22, turn: 20, zoom: { side: 1.2, stacked: 1.5 } },
});
