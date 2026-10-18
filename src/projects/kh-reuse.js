import { defineProject } from './schema.js';

/**
 * kh ReUse (written exactly so; its link stays #kh-reuse) - a laptop, a plain
 * mesh (static/models/laptop.glb, lid open), drawn as itself, standing still
 * with its screen to the visitor; a phone instead on a phone.
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
        + 'where the author is Head of Digital Technologies.',
        'Visitors can browse demolition projects, such as Stuttgart Rathaus and '
        + 'Kittler Schule Heilbronn, and see the elements recovered from each '
        + 'one. The element catalog can be filtered by material, profile type, '
        + 'profile and condition. Registered users can also add new projects '
        + 'and elements, and collect elements in a personal basket for reuse.',
        'Note: the data in this version of the website is fictional and serves '
        + 'only to demonstrate the platform.',
        'Tech stack: React (Vite) frontend on Firebase Hosting, Node.js server '
        + 'on Google Cloud Run, and a MongoDB Atlas database.',
        'The author wrote both the frontend and the backend from scratch, '
        + 'before AI tools were part of everyday development.',
        '👉 Live demo: [kh-reuse.web.app](https://kh-reuse.web.app/)',
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

    // A small reuse sign in its pebble (static/models/reuse.glb, made in code)
    thumbModel: 'models/reuse.glb',
    thumbSize: 1.9,
    detailModel: 'models/laptop.glb',
    // The mesh itself rather than points, in light grey (screen [r, g, b],
    // where it faces the light and where it turns away), and no turn of its own
    solid: { lit: [222, 222, 220], shade: [160, 160, 162] },
    still: true,
    // ...and the visitor can't orbit it: the screen stays square on
    orbit: false,
    // A double-click (or double-tap) pauses the film on its screen, and the
    // next plays it on - hinted "pause", like Rock Print's turn
    doubleClick: 'hold',
    // The pebble's points settle onto the laptop's screen and float there
    // in the clouds' inks, over the film below
    screen: 'Screen',
    // The recorded film on the screen, under the points (muted, looping)
    screenVideo: 'videos/kh-reuse.mp4',
    // On a phone (under 860px), a phone instead of the laptop, made in code
    // like it (static/models/phone.glb, its screen also 'Screen'), playing
    // the mobile recording
    phone: { detailModel: 'models/phone.glb', screenVideo: 'videos/kh-reuse-mobile.mp4' },
    // Square-on to the screen (the model's front is its +Z, which the
    // detail view's quarter turn would swing away), from a little above,
    // the whole device - the laptop, or on a phone the phone - while the
    // points settle on its screen; then square-on to that screen, the film
    // starting, 1.2 times as far as would put its edges at the window's
    // (`fillScreen`), so the device's own edges stay in view and its top
    // under the title. With the About drawer out, the whole device again
    // (on a phone, above the drawer - `drawer: 'whole'`)
    view: { elevation: 15, turn: -90, zoom: { side: 1.3, stacked: 1.7 }, lift: { side: 0, stacked: 0.03 }, fillScreen: 1.2, drawer: 'whole' },
});
