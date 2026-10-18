import { defineProject } from './schema.js';

/**
 * kh-reuse - a laptop, a plain mesh (static/models/laptop.glb, lid open),
 * drawn as itself, standing still with its screen to the visitor. No drawer
 * text yet: it comes from the user.
 */
export default defineProject({
    id: 'kh-reuse',
    slot: 3,
    title: 'kh-reuse',
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
        'It was made for [Knippers Helbig](https://www.knippershelbig.com/), '
        + 'where the author is Head of Digital Technologies.',
        'Visitors can browse demolition projects, such as Stuttgart Rathaus and '
        + 'Kittler Schule Heilbronn, and see the elements recovered from each '
        + 'one. The element catalog can be filtered by material, profile type, '
        + 'profile and condition. Registered users can also add new projects '
        + 'and elements, and collect elements in a personal basket for reuse.',
        'Tech stack: React (Vite) frontend on Firebase Hosting, Node.js server '
        + 'on Google Cloud Run, and a MongoDB Atlas database.',
        'The author wrote both the frontend and the backend from scratch, '
        + 'before AI tools were part of everyday development.',
        '👉 Live demo: [kh-reuse.web.app](https://kh-reuse.web.app/)',
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
    // while it loads; then square-on to the device's screen, its edges at
    // the window's (`fillScreen`) - the laptop's, or on a phone the phone's
    view: { elevation: 15, turn: -90, zoom: { side: 2.0, stacked: 1.8 }, lift: { side: -0.15, stacked: 0.03 }, fillScreen: true },
});
