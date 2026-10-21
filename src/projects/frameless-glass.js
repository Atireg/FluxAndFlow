import { defineProject } from './schema.js';

/**
 * Frameless Glass Structures - a glass pavilion from the user's Rhino model
 * (glasstec.obj, converted by tools/models/obj-to-glb.mjs, one part per
 * material). Drawn as itself, each part in its own look; the person beside
 * it isn't drawn - the pebble's points fall and form them instead.
 */
export default defineProject({
    id: 'frameless-glass',
    slot: 7,
    title: 'Frameless Glass Structures',
    // Research, teaching or the real world - its tag, and the catalog's filter
    category: 'real-world',

    detailModel: 'models/frameless-glass.glb',
    // The model itself, the parts by their Rhino material names; anything
    // not listed in `solid`'s light grey
    solid: { lit: [222, 222, 220], shade: [160, 160, 162] },
    parts: {
        Metal: { lit: [118, 116, 114], shade: [52, 51, 54] },
        // The timber (Plaster in Rhino): warm oak
        Plaster: { lit: [214, 178, 132], shade: [146, 104, 66] },
        Glass: { lit: [236, 242, 244], shade: [196, 208, 214], opacity: 0.14 },
        'Custom (2)': { lit: [236, 242, 244], shade: [196, 208, 214], opacity: 0.14 },
        // The steel along the ridge of the sloping ends, as the rest
        'Custom (7)': { lit: [118, 116, 114], shade: [52, 51, 54] },
        'Custom (8)': { lit: [118, 116, 114], shade: [52, 51, 54] },
    },
    // The person: the pebble's points form them, in three greys
    figure: 'People_ZIM',
    inks: [[176, 174, 170], [128, 126, 123], [80, 79, 78]],
    // A double-click (or double-tap) stops its turn, the next sets it going
    doubleClick: 'hold',
    view: { elevation: 30, turn: 0, zoom: { side: 1.8, stacked: 1.6 } },
});
