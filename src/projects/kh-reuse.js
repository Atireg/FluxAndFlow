import { DEVICE, DEVICE_VIEW } from './devices.js';
import { defineProject } from './schema.js';

/**
 * kh ReUse (written exactly so; its link stays #kh-reuse) - a laptop drawn as
 * itself, standing still with the pebble's points settling on its screen,
 * then the camera moving in as the user's recording plays there; a phone
 * instead on a phone. The models are made in code: tools/models/.
 */
export default defineProject({
    id: 'kh-reuse',
    slot: 3,
    title: 'kh ReUse',
    // Research, teaching or the real world - its tag, and the catalog's filter
    category: 'real-world',

    // The drawer's rows and text, the user's own; state the role accurately
    year: '2025',
    role: 'Web developer',
    context: 'Final exam project for JavaScript Developer at SoftUni',
    body: [
        'kh ReUse – Salvaged Building Elements Platform',
        'kh ReUse is a web platform for collecting, cataloguing and reusing '
        + 'building elements salvaged from demolished buildings, so that usable '
        + 'steel beams, timber and glass stay in circulation instead of going to '
        + 'landfill. It brings together the author’s background as an architect '
        + 'and their work in software development.',
        'It was made for [knippershelbig](https://www.knippershelbig.com/), '
        + 'where the author is Head of Digital Technologies. The author wrote '
        + 'the frontend and the backend from scratch, before AI tools were part '
        + 'of everyday development.',
        'Visitors browse demolition projects and the elements recovered from '
        + 'each one, filtering the catalogue by material, profile type, profile '
        + 'and condition.',
        'Registered users add their own projects and elements, and collect '
        + 'elements in a personal basket for reuse.',
        'Note: the data in this version of the website is fictional and serves '
        + 'only to demonstrate the platform.',
        '👉 Live demo: [kh-reuse.web.app](https://kh-reuse.web.app/)',
        'Tech overview',
        [
            'Frontend: React 19 and Vite 6, with React Router and plain CSS; on '
            + 'a phone the element table becomes cards.',
            'Backend: a small Node.js server without a framework, in Docker on '
            + 'Google Cloud Run, with the data in MongoDB Atlas.',
            'Accounts: email and password; guests browse, signed-in users add, '
            + 'and only a record’s owner can edit or delete it.',
            'Quality: ESLint, and every change checked in a real browser with '
            + 'Playwright at phone, tablet and desktop widths.',
            'Hosting: Firebase Hosting, deployed by GitHub Actions; no keys or '
            + 'credentials in the repository.',
        ],
    ],

    // Screenshots in the text, each by the paragraph about what it shows
    // (`after`): the home page, the project page and search, then the two
    // forms for adding - the desktop ones across the drawer, the phone ones
    // two to a row (`pair`), on a phone too
    images: [
        {
            src: 'images/kh-reuse-01-home.jpg',
            alt: 'The kh ReUse home page on a desktop: a welcome, a short introduction, and the newest projects, Stuttgart Rathaus and Kittler Schule Heilbronn',
            ratio: '1500 / 938',
            wide: true,
            after: 2,
        },
        {
            src: 'images/kh-reuse-02-project.jpg',
            alt: 'The Stuttgart Rathaus project page on a desktop: a photo, building data, a description, and a table of the building elements recovered from it',
            ratio: '1500 / 938',
            wide: true,
            after: 3,
        },
        {
            src: 'images/kh-reuse-06-mobile-home.jpg',
            alt: 'The kh ReUse home page on a phone: a welcome, a short introduction, and the newest projects',
            ratio: '700 / 1192',
            pair: true,
            after: 3,
        },
        {
            src: 'images/kh-reuse-04-mobile-search.jpg',
            alt: 'On a phone: searching the element catalog by material, profile type, profile and condition',
            ratio: '700 / 1192',
            pair: true,
            after: 3,
        },
        {
            src: 'images/kh-reuse-03-mobile-new-project.jpg',
            alt: 'On a phone: the form for adding a new demolition project',
            ratio: '700 / 1192',
            pair: true,
            // (first of its group, yet half - beside the next on a wide screen)
            half: true,
            after: 4,
        },
        {
            src: 'images/kh-reuse-05-mobile-new-element.jpg',
            alt: 'On a phone: the form for adding a new building element, here a steel IPE100 beam',
            ratio: '700 / 1192',
            pair: true,
            after: 4,
        },
    ],

    // A small reuse sign in its pebble
    thumbModel: 'models/reuse.glb',
    thumbSize: 1.9,
    detailModel: 'models/laptop.glb',
    // Drawn as itself in light grey, still, the pebble's points circling on
    // its screen until the film there has loaded (devices.js)
    ...DEVICE,
    // A double-click (or double-tap) pauses the film on its screen, and the
    // next plays it on - hinted "pause", like Rock Print's turn
    doubleClick: 'hold',
    // The recorded film on the screen, under the points (muted, looping)
    screenVideo: 'videos/kh-reuse.mp4',
    // On a phone (under 860px), a phone instead of the laptop (its screen
    // also 'Screen'), playing the mobile recording
    phone: { detailModel: 'models/phone.glb', screenVideo: 'videos/kh-reuse-mobile.mp4' },
    // Seen as every device is (devices.js): the whole of it first, then in
    // on its screen as the film starts; how close and how high the first
    // view is, on a wide screen, is its own (on a phone it's fitted)
    view: { ...DEVICE_VIEW, zoom: { side: 1.4, stacked: 1.85 }, lift: { side: 0.025, stacked: 0.07 } },
});
