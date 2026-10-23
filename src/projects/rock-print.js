import { defineProject } from './schema.js';

/**
 * Rock Print Pavilion - a scanned point cloud that gathers out of a
 * scattered cloud each time it opens.
 */
export default defineProject({
    id: 'rock-print',
    slot: 0,
    title: 'Rock Print Pavilion',
    // Research, teaching or the real world - its tag, and the catalog's filter
    category: 'research',

    // The drawer's rows and text; anything left empty is skipped. State
    // the role accurately - the page implies authorship of what it shows.
    year: '2018',
    role: 'Project lead, doctoral research',
    context: 'Gramazio Kohler Research, ETH Zurich, for "Hello, Robot." '
        + 'at the Gewerbemuseum Winterthur',
    body: [
        'A temporary pavilion on the Kirchplatz in Winterthur, built in four '
        + 'weeks by a mobile robot, the In situ Fabricator, out of nothing '
        + 'but loose stones and string. Eleven three-metre pillars carry an '
        + 'eight-tonne steel roof.',
        'The robot lays string between layers of gravel in a pattern it '
        + 'keeps calculating as it builds. Pressed together, the loose stones '
        + 'jam into a stable, load-bearing structure. It took about 30 tonnes '
        + 'of stone and 120 km of string, with no binder, so both can be '
        + 'taken apart and reused.',
        'It was shown from 4 October to 4 November 2018 in the exhibition '
        + '"Hello, Robot. Design between Human and Machine", as part of the '
        + 'research project Design and Robotic Fabrication of Jammed '
        + 'Architectural Structures.',
    ],
    credits: 'Gramazio Kohler Research, ETH Zurich. Petrus '
        + 'Aejmelaeus-Lindström and Gergana Rusenova (project lead), Hannes '
        + 'Mayer, Dr. Ammar Mirjan, Esther Lombardini, Jesús Medina Ibáñez. '
        + 'Structural advice and sponsorship: Lüchinger+Meyer Bauingenieure.',

    thumbModel: 'models/rock.gltf',
    detailModel: 'models/RockPrintStructureReduced.glb',

    // Camera angle in the detail view, in degrees: elevation above the
    // horizon, azimuth around the model, and turn - how far the model
    // is spun round when it first appears, before its slow rotation
    // carries on from there. Leave any out for 0; leave `view` out
    // altogether for the square-on default. `zoom` comes in closer than
    // fitting the pebble, `lift` raises the model on screen (a share of
    // its height); each can be per layout. These were fitted to a phone
    // screenshot of the shot wanted, so they reproduce it there.
    view: {
        elevation: 58,
        azimuth: 4,
        // 118 in the screenshot, minus the 24 the model turns while its
        // points gather (GATHER_DURATION at DETAIL_ROTATE_SPEED), so the
        // shot is what's on screen as the gather completes
        turn: 94,
        zoom: { stacked: 1.75, side: 1.4 },
        lift: { stacked: 0.14, side: 0 },
        // Once the points have gathered, the camera slowly nods this many
        // degrees up and back down past the view while the model turns
        sway: 13,
    },

    // Every 10 seconds the camera moves in on a point of the pavilion, then
    // back out, following the point as the model turns
    autoZoom: 10,
    // ...in turn: on a point, then from inside, standing among the columns at
    // a person's eye height (a share of the pavilion's height above its
    // ground), then from the same spot facing back the other way
    eyeLevel: 0.4,

    // A double-click (or double-tap) holds the pavilion still - its turn
    // and the camera's nod - until the next one, rather than zooming in
    doubleClick: 'hold',

    // Each time the project opens, its points start out scattered and
    // slowly gather into the pavilion - see GATHER_DURATION
    gather: true,

    // The films, from Vimeo, above the pictures in the drawer, in this order
    videos: [
        { vimeo: '294086902', title: 'Rock Print Pavilion - film 1' },
        { vimeo: '306400252', title: 'Rock Print Pavilion - film 2' },
    ],
    // Pictures in the About drawer, in order: the first spans the full
    // width, the rest sit two to a row. An entry with no `src` yet shows
    // as an empty frame, holding its place. Paths are like the models'
    // (e.g. 'images/rock-print-1.jpg', in static/). `ratio` is optional,
    // as a CSS aspect ratio, '3 / 2' if left out.
    //   { src: '', alt: 'what it shows', caption: '', ratio: '4 / 5' }
    images: [
        // The plans after the robot and the pillars, two to a row
        {
            src: 'images/rock-print-06-robot-positions.jpg',
            alt: 'Plan of the pavilion: the robot\'s five positions, its reach around each, the columns it printed from there and the safety distances',
            caption: '',
            ratio: '900 / 1106',
            half: true,
            after: 0,
        },
        {
            src: 'images/rock-print-07-column-layout.jpg',
            alt: 'Plan of the pavilion, 8 by 10 metres: each column\'s position and orientation, and the roof\'s axes',
            caption: '',
            ratio: '900 / 1106',
            after: 0,
        },
        // How the columns are shaped, and how the built pavilion behaved
        {
            src: 'images/rock-print-08-column-shapes.jpg',
            alt: 'Four column shapes, each set by a top, a middle and a bottom hexagon within the robot\'s reach',
            caption: '',
            ratio: '900 / 1024',
            half: true,
            after: 1,
        },
        {
            src: 'images/rock-print-09-strain.jpg',
            alt: 'A scan of the columns seen from above, and the strain measured in the string of each, S1 to S7',
            caption: '',
            ratio: '900 / 1593',
            after: 1,
        },
        {
            src: 'images/rock-print-10-settlement.jpg',
            alt: 'The roof\'s settlement at its four corners over 26 days, beside a scan of the pavilion and a photo of a measuring point under the roof',
            caption: '',
            ratio: '1500 / 1346',
            wide: true,
            after: 1,
        },
        {
            src: 'images/rock-print-01-exterior.jpg',
            alt: 'The pavilion under a chestnut tree beside a stone church: columns of loose stone holding up a thin rusted steel roof',
            caption: '',
            ratio: '1500 / 1122',
        },
        {
            src: 'images/rock-print-02-inside.jpg',
            alt: 'Inside the pavilion, a visitor walks between the stone columns, blurred in motion',
            caption: '',
            ratio: '900 / 589',
        },
        {
            src: 'images/rock-print-03-printing.jpg',
            alt: 'A robotic arm on a tracked vehicle lays stone and thread layer by layer as a column rises, watched by an operator',
            caption: '',
            ratio: '900 / 601',
        },
        {
            src: 'images/rock-print-04-touch.jpg',
            alt: 'A visitor touches a column, its surface of loose stones bound by thread',
            caption: '',
            ratio: '900 / 601',
        },
        {
            src: 'images/rock-print-05-detail.jpg',
            alt: 'Close-up of the columns: crushed stone held together by loops of white thread, with a blue line running through',
            caption: '',
            ratio: '900 / 601',
        },
    ],
});
