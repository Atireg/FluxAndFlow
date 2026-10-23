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
    year: '2024',
    role: 'Principal investigator',
    context: 'knippershelbig, project Frameless Glass Structures, for Glasstec 2024 Duesseldorf',

    // The drawer's text, as the user chose it (option 1 of three)
    body: [
        'In most façades, glass only fills the openings: it closes the space, '
        + 'while a separate substructure carries the loads. The result is a '
        + 'resource-heavy construction that leaves the structural potential of '
        + 'the glass unused. Within the ZIM research project “Frameless Glass '
        + 'Construction”, a linear connection detail was developed for '
        + 'horizontal and vertical glass shells that lets the glass itself '
        + 'carry load - a step towards resource-efficient glass shell '
        + 'structures. A first prototype, a self-supporting, thermally '
        + 'insulated double-glazed shell, was shown at glasstec in 2024.',
        'Construction. A thin linear steel profile is laminated between the '
        + 'two inner panes. The detail keeps material to a minimum while '
        + 'passing part of the load into the glass and the PVB interlayer. '
        + 'Neighbouring elements are joined by point bolt connections; an '
        + 'oversized hole on one side of each bolt takes up the tolerances of '
        + 'assembly, so the parts can be adjusted as they go together.',
        'Geometry. A parametric tool generates the shell from the rules of '
        + 'translation surfaces, which guarantee a form made entirely of flat '
        + 'glass panels. It links directly to the structural analysis '
        + 'software, so each design decision can be checked as it is made, and '
        + 'it produces the 3D models and shop drawings for every part - steel '
        + 'fittings, glass panels and bolts - each labelled for assembly. It '
        + 'works for any shell geometry, across many kinds of architecture.',
        'Thermal analysis. Simulations test how the steel-glass connection '
        + 'behaves in different climates. At high temperatures steel, glass and '
        + 'the PVB interlayer expand at different rates, which could lead to '
        + 'delamination; the aim is to confirm that the connection keeps its '
        + 'structural integrity and carries its load in extreme heat, so it can '
        + 'be used safely in façades and roofs.',
    ],
    credits: 'Funded by the Federal Ministry for Economic Affairs and Climate '
        + 'Action on the basis of a resolution of the German Bundestag.',

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
    // Standing still (asked for); a double-click plays the tour again
    still: true,
    doubleClick: 'tour',
    // Over a sheet, a joint or a support: what it is, the turn held
    info,
    // A cut across its length, slid by the visitor
    section: { reverse: true }, // in from the other end (asked for)
    // Ground under it, so the person stands on something
    floor: true,

    // The film, from YouTube, above the pictures in the drawer
    videos: [
        { youtube: 'JnKaReHR4So', title: 'Frameless Glass Structures - film', after: 0 },
    ],
    // Each picture by the paragraph it belongs to (`after`, 0 the first)
    images: [
        {
            src: 'images/frameless-glass-01.jpg',
            alt: 'The glass pavilion at the fair: a pointed arch of glass sheets in front of white curtains, a visitor photographing it',
            ratio: '1500 / 633',
            after: 0,
        },
        {
            src: 'images/frameless-glass-04.jpg',
            alt: 'One sloping end of the pavilion from below, glass sheets on their steel supports, the fair hall behind',
            ratio: '1500 / 633',
            wide: true,
            after: 0,
        },
        {
            src: 'images/frameless-glass-05.jpg',
            alt: 'Drawing: section through the joint between two glass sheets, the steel profiles and their fixings',
            ratio: '1500 / 882',
            after: 1,
        },
        {
            src: 'images/frameless-glass-02.jpg',
            alt: 'Looking up at four glass sheets meeting at the ridge, joined by slim steel profiles along their edges',
            ratio: '900 / 1251',
            after: 1,
        },
        {
            src: 'images/frameless-glass-03.jpg',
            alt: 'Close-up of two laminated glass sheets meeting at an angle, the bolted steel joint between their edges',
            ratio: '900 / 529',
            after: 1,
        },
        {
            src: 'images/frameless-glass-07.jpg',
            alt: 'Diagram: the pavilion drawn on a translation surface between two ellipses, its eight numbered glass sheets, joints, angles and dimensions',
            ratio: '1500 / 882',
            after: 2,
        },
        {
            src: 'images/frameless-glass-06.jpg',
            alt: 'Diagrams: three shells generated by the tool from different ellipses and splitting surfaces, each with its dimensions and one panel marked',
            ratio: '1500 / 886',
            wide: true,
            after: 2,
        },
        {
            src: 'images/frameless-glass-08.jpg',
            alt: 'Drawing: the pavilion\'s layout with every glass sheet and steel profile laid out beside it, each labelled for assembly',
            ratio: '1500 / 882',
            wide: true,
            after: 2,
        },
        {
            src: 'images/frameless-glass-09.jpg',
            alt: 'Thermal simulations of the steel-glass joint for four climates - Moscow, Zurich, Bangalore and Dubai - temperatures shown in colour',
            ratio: '1500 / 882',
            after: 3,
        },
    ],
    // Steeply from above, its length up the screen, on both layouts (the
    // user's chosen view) - where the tour's turn ends
    view: { elevation: 62, turn: 72, zoom: { side: 1.8, stacked: 2.1 }, lift: { stacked: 0.09 }, drawer: { side: 6, above: 8, zoom: { side: 1.45, stacked: 1.1 } } },
    // As it opens: one full turn round it, then the section slides to just
    // past the middle as the camera closes in square-on to the ridge joint
    // there (GS2_GS6), its profile facing the visitor
    tour: { orbit: 5, turns: 0.5, cut: 0.472, focus: 'GS3_GS7', reach: { side: 0.17, stacked: 0.08 }, over: 8, side: 20, above: 45 },
});
