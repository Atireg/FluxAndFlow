import { defineProject } from './schema.js';

/**
 * What hovering over a part says, from the user's drawing: the eight glass
 * sheets GS1-GS8 (GS1-GS4 one side of the ridge, GS5-GS8 the other, rows 1
 * and 4 the sloping ends), the joints between them with their angles -
 * across the ridge an upper and a lower steel profile (_O, _U), along it the
 * ridge's steel - and the supports at the sloping ends' bottom edges (_UK).
 * The part names are the model's (tools/models/frameless-glass.mjs).
 */
const ACROSS = [['GS1', 'GS2'], ['GS2', 'GS3'], ['GS3', 'GS4'], ['GS5', 'GS6'], ['GS6', 'GS7'], ['GS7', 'GS8']];
const ALONG = [['GS1', 'GS5', 167], ['GS2', 'GS6', 165], ['GS3', 'GS7', 165], ['GS4', 'GS8', 167]];
const ACROSS_ANGLE = 153;
const SUPPORTED = ['GS1', 'GS4', 'GS5', 'GS8'];
const SUPPORT_ANGLE = 156;

const info = {};
ACROSS.forEach(([a, b]) => {
    info[`${a}_${b}`] = {
        title: `Joint ${a}_${b}`,
        lines: [`Between glass sheets ${a} and ${b}`, `Angle ${ACROSS_ANGLE}°`, 'Steel profiles above and below the glass (_O, _U)'],
    };
});
ALONG.forEach(([a, b, angle]) => {
    info[`${a}_${b}`] = { title: `Joint ${a}_${b}`, lines: [`Along the ridge, between ${a} and ${b}`, `Angle ${angle}°`] };
});
SUPPORTED.forEach((sheet) => {
    info[`${sheet}_UK`] = { title: `Support ${sheet}_UK`, lines: [`Under the bottom edge of ${sheet}`, `Angle ${SUPPORT_ANGLE}°`] };
});
['GS1', 'GS2', 'GS3', 'GS4', 'GS5', 'GS6', 'GS7', 'GS8'].forEach((sheet) => {
    const joints = [...ACROSS, ...ALONG].filter((pair) => pair.includes(sheet)).map(([a, b]) => `${a}_${b}`);
    info[sheet] = {
        title: `Glass sheet ${sheet}`,
        lines: [`Joints: ${joints.join(', ')}`, ...(SUPPORTED.includes(sheet) ? [`Support: ${sheet}_UK`] : [])],
    };
});

/**
 * Frameless Glass Structures - a glass pavilion from the user's Rhino model
 * (glasstec.obj, converted by tools/models/frameless-glass.mjs: its sheets,
 * joints and supports named, the rest a part per material). Drawn as itself, each part in its own look; the person beside
 * it isn't drawn - the pebble's points fall and form them instead.
 */
export default defineProject({
    id: 'frameless-glass',
    slot: 7,
    title: 'Frameless Glass Structures',
    // Under the title, in orange (the user's words)
    notice: 'This part of the website is still under construction.',
    // Research, teaching or the real world - its tag, and the catalog's filter
    category: 'real-world',

    // The drawer's text, as the user chose it (option 1 of three)
    body: [
        'Frameless Glass Structures is a pavilion of glass and almost nothing '
        + 'else. Eight laminated glass sheets fold into a pointed arch, about '
        + '6.7 m long and 3.3 m wide, and carry themselves: there is no frame. '
        + 'Slim steel profiles join the sheets edge to edge, at angles between '
        + '153° and 167°, and the glass does the structural work. It was shown '
        + 'at glasstec in Düsseldorf.',
    ],

    detailModel: 'models/frameless-glass.glb',
    // The model itself, the parts by their Rhino material names; anything
    // not listed in `solid`'s light grey
    solid: { lit: [222, 222, 220], shade: [160, 160, 162] },
    parts: {
        Metal: { lit: [204, 204, 202], shade: [168, 168, 168] },
        // The timber (Plaster in Rhino): warm oak
        Plaster: { lit: [214, 178, 132], shade: [146, 104, 66] },
        Glass: { lit: [236, 242, 244], shade: [196, 208, 214], opacity: 0.14 },
        'Custom (2)': { lit: [236, 242, 244], shade: [196, 208, 214], opacity: 0.14 },
        // The steel along the ridge of the sloping ends, as the rest
        'Custom (7)': { lit: [204, 204, 202], shade: [168, 168, 168] },
        'Custom (8)': { lit: [204, 204, 202], shade: [168, 168, 168] },
    },
    // The person: the pebble's points form them, in three greys
    figure: 'People_ZIM',
    inks: [[176, 174, 170], [128, 126, 123], [80, 79, 78]],
    // Standing still (asked for); a double-click zooms in and back out
    still: true,
    // Over a sheet, a joint or a support: what it is, the turn held
    info,
    // A cut across its length, slid by the visitor
    section: true,
    // Ground under it, so the person stands on something
    floor: true,

    // The film, from YouTube, above the pictures in the drawer
    videos: [
        { youtube: 'JnKaReHR4So', title: 'Frameless Glass Structures - film' },
    ],
    // The pavilion at the fair, its joints close up, and the joint in section
    images: [
        {
            src: 'images/frameless-glass-01.jpg',
            alt: 'The glass pavilion at the fair: a pointed arch of glass sheets in front of white curtains, a visitor photographing it',
            ratio: '1500 / 633',
        },
        {
            src: 'images/frameless-glass-02.jpg',
            alt: 'Looking up at four glass sheets meeting at the ridge, joined by slim steel profiles along their edges',
            ratio: '900 / 1251',
        },
        {
            src: 'images/frameless-glass-03.jpg',
            alt: 'Close-up of two laminated glass sheets meeting at an angle, the bolted steel joint between their edges',
            ratio: '900 / 529',
        },
        {
            src: 'images/frameless-glass-04.jpg',
            alt: 'One sloping end of the pavilion from below, glass sheets on their steel supports, the fair hall behind',
            ratio: '1500 / 633',
            wide: true,
        },
        {
            src: 'images/frameless-glass-05.jpg',
            alt: 'Drawing: section through the joint between two glass sheets, the steel profiles and their fixings',
            ratio: '1500 / 882',
            wide: true,
        },
    ],
    // Steeply from above, its length up the screen, on both layouts (the
    // user's chosen view) - where the tour's turn ends
    view: { elevation: 62, turn: 72, zoom: { side: 1.8, stacked: 2.1 }, lift: { stacked: 0.09 } },
    // As it opens: one full turn round it, then the section slides to just
    // past the middle as the camera closes in square-on to the ridge joint
    // there (GS2_GS6), its profile facing the visitor
    tour: { orbit: 10, cut: 0.48, focus: 'GS2_GS6', reach: 0.25, over: 6 },
});
