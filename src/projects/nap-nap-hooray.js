import { DEVICE, DEVICE_VIEW } from './devices.js';
import { defineProject } from './schema.js';

/**
 * Nap Nap Hooray - the user's baby-sleep website, shown on a phone made in
 * code (the same as kh ReUse's), the pebble's points circling on its screen
 * while the user's recording of the site loads, then playing there. A
 * crescent moon in its pebble. The models are made in code: tools/models/.
 */
export default defineProject({
    id: 'nap-nap-hooray',
    slot: 4,
    title: 'Nap Nap Hooray',
    // Research, teaching or the real world - its tag, and the catalog's filter
    category: 'real-world',

    // The drawer's rows and text, the user's own word for word
    year: '2026',
    role: 'Web developer using AI',
    context: 'Sleepless nights and cranky days',
    body: [
        'Having a baby is part of the real world, and it is the moment the '
        + 'real world turns busy, messy and complicated, with lots of flux and '
        + 'flows. The author built this project in collaboration with the sleep '
        + 'consultant Hristiana Yovkova-Arnaudova and the kind help of AI agents.',
        'Nap Nap Hooray — “Every snooze, celebrated.”',
        'Nap Nap Hooray is a mobile-friendly website for logging and '
        + 'understanding a baby’s sleep: '
        + '[atireg.github.io/baby-sleep-patterns](https://atireg.github.io/baby-sleep-patterns/)',
        'Parents track each sleep live on their phone: settling, asleep, night '
        + 'wakings and feeds, then wake-up. The site turns the log into '
        + 'practical guidance:',
        [
            'the wake window before the next nap, with a target set by the '
            + 'parents and the time to “enter the room”;',
            'the expected nap length and the expected morning wake-up;',
            'a “daytime sleep tank” that fills with the day’s naps;',
            'a summary of last night, plus wake/sleep windows and nap history '
            + 'for the last 5 days;',
            'the best times to meet friends;',
            'longer-term charts.',
        ],
        'Everything can be edited afterwards, and both parents see the same log '
        + 'live on their own phones.',
        'Tech overview',
        [
            'Frontend: React 18 + Vite 5, with plain CSS (light and dark '
            + 'themes). Plotly charts are view-only on phones and load only when '
            + 'needed. The tank is a custom SVG.',
            'Data: Firebase. Google sign-in and a Firestore database hold the '
            + 'shared log, the sleep in progress, and the family settings. Access '
            + 'is limited to an allow-list of family emails, it works offline, '
            + 'and it stays on the free Spark plan. Signed out, everything stays '
            + 'on the device.',
            'Data rules: feeds under 25 minutes count as sleep. A night belongs to '
            + 'the evening it started. Forecasts use the averages of the last '
            + '3–5 days.',
            'Import/export: Excel export. The Excel parsers can also read a '
            + 'Bulgarian sleep-consultant template (upload is currently hidden).',
            'Quality: 49 Vitest unit tests. Each change is also checked in a real '
            + 'browser at phone width with Playwright, and against the Firebase '
            + 'emulator with two simulated phones.',
            'Hosting: GitHub Pages, deployed by GitHub Actions on every merge. '
            + 'Open phones reload themselves when a new version is released.',
            'Backups: a nightly GitHub Actions job copies the whole log into a '
            + 'private repository as JSON and CSV, with history. It emails an '
            + 'alert if the data suddenly shrinks, and a manual “Restore” job '
            + 'that only adds missing data.',
            'Privacy: the code repository is public, but no personal data or '
            + 'keys are stored in it.',
        ],
    ],

    // Screenshots on a phone: two to a row on a wide screen, the first too
    // (`half`), one to a row on a phone
    images: [
        {
            src: 'images/nap-nap-hooray-01.jpg',
            alt: 'On a phone: the Now card while awake - the time since waking, the target wake window, the next nap and the estimated bedtime',
            ratio: '900 / 1948',
            half: true,
        },
        {
            src: 'images/nap-nap-hooray-02.jpg',
            alt: 'On a phone: the Now card during a nap - how long she has slept, the wake window before it, when she may wake, and how she fell asleep',
            ratio: '900 / 1948',
        },
        {
            src: 'images/nap-nap-hooray-03.jpg',
            alt: 'On a phone: the daytime sleep tank, 59% full, with today’s naps and the nap-time target',
            ratio: '900 / 1948',
        },
        {
            src: 'images/nap-nap-hooray-04.jpg',
            alt: 'On a phone: last night - time asleep and awake, wakings and feeds, and a timeline of the night',
            ratio: '900 / 1948',
        },
        {
            src: 'images/nap-nap-hooray-05.jpg',
            alt: 'On a phone: wake and sleep windows over the last five days, and the naps history',
            ratio: '900 / 1948',
        },
        {
            src: 'images/nap-nap-hooray-06.jpg',
            alt: 'On a phone: the sleep timeline of the last five days, with the good times to meet friends, and the form for adding a sleep',
            ratio: '900 / 1948',
        },
    ],

    // A crescent moon in its pebble - smaller than the others' (1.9), its
    // solid shape reads larger
    thumbModel: 'models/moon.glb',
    thumbSize: 1.3,
    // A phone, as kh ReUse's on a phone (devices.js): turning, the pebble's
    // points circling on its screen, until its recording has loaded
    detailModel: 'models/phone.glb',
    ...DEVICE,
    // A double-click (or double-tap) pauses the film, the next plays it on
    doubleClick: 'hold',
    // The user's recording of the site (390 x 664, as the screen; muted, looping)
    screenVideo: 'videos/nap-nap-hooray.mp4',
    // Seen as every device is (devices.js); how close and how high the first
    // view is, on a wide screen, is its own (on a phone it's fitted)
    view: { ...DEVICE_VIEW, zoom: { side: 1.2, stacked: 1.85 }, lift: { side: -0.03, stacked: 0.07 } },
});
