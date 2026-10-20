import { DEVICE } from './devices.js';
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
        + 'building elements salvaged from demolished buildings. It brings '
        + 'together the author’s background as an architect and their work in '
        + 'software development. The aim is to keep usable materials like steel '
        + 'beams, timber and glass in circulation instead of sending them to '
        + 'landfill.',
        'It was made for [knippershelbig](https://www.knippershelbig.com/), '
        + 'where the author is Head of Digital Technologies. '
        + 'The author wrote both the frontend and the backend from scratch, '
        + 'before AI tools were part of everyday development.',
        'Visitors can browse demolition projects, such as Stuttgart Rathaus and '
        + 'Kittler Schule Heilbronn, and see the elements recovered from each '
        + 'one. The element catalog can be filtered by material, profile type, '
        + 'profile and condition. Registered users can also add new projects '
        + 'and elements, and collect elements in a personal basket for reuse.',
        'Note: the data in this version of the website is fictional and serves '
        + 'only to demonstrate the platform.',
        'Tech stack: React (Vite) frontend on Firebase Hosting, Node.js server '
        + 'on Google Cloud Run, and a MongoDB Atlas database.',
        '👉 Live demo: [kh-reuse.web.app](https://kh-reuse.web.app/)',
        'Tech overview',
        [
            'Frontend: React 19 + Vite 6, with React Router 7 and plain CSS. The '
            + 'layout is responsive: on phones and tablets the wide element table '
            + 'becomes cards with collapsible sections, and on desktop the '
            + 'add-element form flows into two or three aligned columns. '
            + 'Stylesheets get new file names with each build, so a deploy never '
            + 'mixes old styles with new code. Toast messages come from '
            + 'react-toastify.',
            'Backend: a small Node.js 22 HTTP server without a framework, '
            + 'packaged with Docker and running on Google Cloud Run. Data lives in '
            + 'MongoDB Atlas (free M0 cluster) in projects, elements, users, '
            + 'baskets and sessions.',
            'Accounts and access: email/password sign-up and login with sessions '
            + 'stored in MongoDB. Guests can browse projects and elements. '
            + 'Logged-in users can add projects and elements and collect elements '
            + 'in a personal basket (“Warenkorb”). Only a record’s owner can edit '
            + 'or delete it; the server checks this as well as the website.',
            'Data rules: elements belong to a project and can be filtered by '
            + 'material, profile type, profile and condition. Updates never '
            + 'overwrite a record’s ID, owner or creation date.',
            'Import/export: an Excel upload for adding elements in bulk exists in '
            + 'the code, but it’s currently hidden.',
            'Quality: ESLint. There are no automated unit tests yet. Changes are '
            + 'checked in a real browser with Playwright at phone, tablet and '
            + 'desktop widths against the live backend, and server changes are '
            + 'tested against a stand-in database before deploying.',
            'Hosting: the frontend is on Firebase Hosting, deployed by GitHub '
            + 'Actions on every merge to main. The server is redeployed to Cloud '
            + 'Run by hand (gcloud run deploy --source), and its database '
            + 'connection string is set as an environment variable there.',
            'Privacy: no database credentials or keys are stored in the '
            + 'repository. The .env file holding the connection string is '
            + 'excluded from git.',
        ],
    ],

    // Screenshots: the two on a desktop across the drawer, then the three on
    // a phone two to a row (`pair`), on a phone too
    images: [
        {
            src: 'images/kh-reuse-01-home.jpg',
            alt: 'The kh ReUse home page on a desktop: a welcome, a short introduction, and the newest projects, Stuttgart Rathaus and Kittler Schule Heilbronn',
            ratio: '1500 / 938',
            wide: true,
        },
        {
            src: 'images/kh-reuse-02-project.jpg',
            alt: 'The Stuttgart Rathaus project page on a desktop: a photo, building data, a description, and a table of the building elements recovered from it',
            ratio: '1500 / 938',
            wide: true,
        },
        {
            src: 'images/kh-reuse-03-mobile-new-project.jpg',
            alt: 'On a phone: the form for adding a new demolition project',
            ratio: '700 / 1192',
            pair: true,
        },
        {
            src: 'images/kh-reuse-04-mobile-search.jpg',
            alt: 'On a phone: searching the element catalog by material, profile type, profile and condition',
            ratio: '700 / 1192',
            pair: true,
        },
        {
            src: 'images/kh-reuse-05-mobile-new-element.jpg',
            alt: 'On a phone: the form for adding a new building element, here a steel IPE100 beam',
            ratio: '700 / 1192',
            pair: true,
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
    // First the whole device, from a little above (`turn: -90` undoes the
    // detail view's quarter turn, so its front faces the camera) while the
    // points settle; then square-on to its screen as the film starts,
    // `fillScreen` times as far back as would put the screen's edges at the
    // window's - the device's own edges in view, its top below the title.
    // With the About drawer out, the whole device again (`drawer: 'whole'`).
    view: { elevation: 15, turn: -90, zoom: { side: 1.4, stacked: 1.85 }, lift: { side: 0.025, stacked: 0.07 }, fillScreen: 1.05, drawer: 'whole' },
});
