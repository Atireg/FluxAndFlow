import { defineProject } from './schema.js';

/**
 * Rock Print Pavilion - a scanned point cloud that gathers out of a
 * scattered cloud each time it opens.
 */
export default defineProject({
    id: 'rock-print',
    slot: 0,
    title: 'Rock Print Pavilion',

    // Fill these in and they appear in the drawer automatically; anything
    // left empty is skipped rather than rendered blank. State the role
    // accurately - the page implies authorship of whatever it shows.
    //   year:    '2018'
    //   role:    what you actually did on it
    //   context: studio, course or research group
    //   body:    ['paragraph', 'paragraph']
    //   credits: collaborators, and the research group to credit
    // TEMP: placeholder text to verify the drawer renders on the live
    // site. Unmistakably fake on purpose - replace with the real copy
    // before sharing this link. See README.md.
    year: '[PLACEHOLDER YEAR]',
    role: '[PLACEHOLDER ROLE - replace before publishing]',
    context: '[PLACEHOLDER CONTEXT]',
    body: [
        '[PLACEHOLDER BODY TEXT] This paragraph exists only to verify '
        + 'that the About drawer opens, scrolls and closes correctly. '
        + 'Replace it with the real project description.',
    ],
    credits: '[PLACEHOLDER CREDITS]',

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

    // Each time the project opens, its points start out scattered and
    // slowly gather into the pavilion - see GATHER_DURATION
    gather: true,

    // Pictures in the About drawer, in order: the first spans the full
    // width, the rest sit two to a row. An entry with no `src` yet shows
    // as an empty frame, holding its place. Paths are like the models'
    // (e.g. 'images/rock-print-1.jpg', in static/). `ratio` is optional,
    // as a CSS aspect ratio, '3 / 2' if left out.
    //   { src: '', alt: 'what it shows', caption: '', ratio: '4 / 5' }
    images: [
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
