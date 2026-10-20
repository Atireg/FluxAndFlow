import { defineProject } from './schema.js';

/**
 * Emergent Space - three copies of a plain mesh, drawn solid in the inks and
 * dropped with live physics onto a ground of the clicked pebble's points
 * until they interlock. A new drop every time.
 */
export default defineProject({
    id: 'emergent-space',
    slot: 1,
    title: 'Emergent Space',
    // Research, teaching or the real world - its tag, and the catalog's filter
    category: 'research',

    // The drawer's rows and text; state the role accurately
    year: '2015',
    role: 'M.Sc. thesis',
    context: 'ITECH M.Sc. thesis, University of Stuttgart',
    body: [
        'How far can loose aggregates build space on their own? This thesis '
        + 'simulates and analyses spatial formations of aggregates. Their '
        + 'micro-mechanical behaviour, and above all how stable each '
        + 'formation is, drives the design.',
        'The design runs as a loop. First, simulate a formation. Then read '
        + 'it through two numbers: how fast the aggregates are still moving, '
        + 'and how many contacts hold them together. Then feed the result '
        + 'back in. The simulation drives an inflatable formwork under online '
        + 'control, which responds to how stable the formation is. The '
        + 'concept was tested on a one-to-one physical model.',
        'The tools were simulation in FISH and Python, statistical analysis, '
        + '3D scanning, physical experiments, and a pneumatic system run '
        + 'directly from the simulation software.',
        'On this page, the three aggregates are dropped with real-time physics '
        + 'running in the browser; the arrows show how fast each is still '
        + 'moving and the dots where they touch, both measured live.',
    ],
    credits: 'ITECH M.Sc. thesis, University of Stuttgart. Thesis advisers: '
        + 'Karola Dierichs, Ehsan Baharlou. Supervisor: Prof. Achim Menges. '
        + 'Second supervisor: Prof. Jan Knippers. Sponsorship: Itasca '
        + 'Educational Partnership Program (IEP).',

    // All across the drawer's full width (`wide`) - three are diagrams
    // whose text is unreadable at half
    // The film, from Vimeo, above the pictures in the drawer
    videos: [
        { vimeo: '148494213', title: 'Emergent Space - film' },
    ],
    images: [
        {
            src: 'images/emergent-space-01-balloon.jpg',
            alt: 'A red balloon pressed into a mass of white interlocking aggregates, above the same scene simulated, with contact forces drawn as red and blue arrows',
            caption: '',
            ratio: '1000 / 1285',
            wide: true,
        },
        {
            src: 'images/emergent-space-02-rig.jpg',
            alt: 'The test rig, labelled: a computer and an Arduino Uno driving a power switching station and three-way magnet valves, fed by a compressor, inflating red balloons',
            caption: '',
            ratio: '1500 / 1064',
            wide: true,
        },
        {
            src: 'images/emergent-space-03-workflow.jpg',
            alt: 'The simulation workflow: 200 aggregates dropped into a 400 by 400 by 200 box, their clump velocity and contact forces from PFC 3D read into Grasshopper, in side and top views',
            caption: '',
            ratio: '1500 / 966',
            wide: true,
        },
        {
            src: 'images/emergent-space-04-results.jpg',
            alt: 'Ten simulations for each of two balloon positions: contact forces and clump velocity per aggregate, with means of 29 contacts and velocities of 0.66 and 0.93 mm',
            caption: '',
            ratio: '1500 / 959',
            wide: true,
        },
        {
            src: 'images/emergent-space-05-scan.jpg',
            alt: 'A 3D scan of the physical model with two balloons in the aggregate mass, above the matching simulation',
            caption: '',
            ratio: '1000 / 1037',
            wide: true,
        },
    ],

    // Its own mesh in its pebble, centred and scaled to this longest
    // side (units; the pebble is 4.4 across) - see addContentToPebble
    thumbModel: 'models/aggregate.glb',
    thumbSize: 1.9,
    // A plain mesh, not a point cloud: its surface is sampled into
    // points as it loads (see pointsFromMeshes)
    detailModel: 'models/aggregate.glb',
    // Framed on its pebble, so the pile stays in frame as it turns, and
    // seen from above enough to read the surface and how they interlock
    view: { elevation: 30, zoom: { side: 1.5, stacked: 1.05 } },
    // Fewer than a mesh gets by default - its arms are thin, and more
    // read as solid rods rather than a cloud. Per aggregate.
    points: 8000,
    // Three copies dropped onto a surface with real physics, every time
    // it opens, tumbling into one another until they settle - then the
    // pile turns. `size` is each aggregate's longest side and `ground`
    // the surface's height, both in the pebble's units (5 across, centred
    // on 0). `contacts`: pulsing dots where the aggregates interlock, once
    // at rest. `closeUp`: then the camera moves in on one of them for 5
    // seconds, back out, and 5 seconds later they drop again.
    // `velocity`: each one's velocity, live, as an arrow and m/s, while it moves.
    // See src/engine/pile.js.
    // A double-click drops them again, hinted "drop again" (no zoom: the
    // camera's own close-ups on the interlocks do the zooming here).
    doubleClick: 'drop',
    drop: { count: 3, size: 3, ground: -1.2, solid: true, contacts: true, closeUp: { hold: 5, after: 5 }, velocity: true },
});
