import { defineProject } from './schema.js';

/**
 * Future Gardens - a model that moves: the user's Rhino mechanism (mechanism.glb, made by
 * tools/models/mechanism.mjs from its two poses): five petals that open on
 * their hinges as the rack, driven by a small motor, slides. A slider over
 * the model plays it. The text is still to come from the user.
 */
export default defineProject({
    id: 'future-gardens',
    slot: 2,
    title: 'Future Gardens',
    category: 'teaching',
    // A small orange line under its name, while the rest is still to come
    notice: 'under construction',
    year: '2022',
    role: 'Teacher',
    client: 'The GPT Group',
    context: 'A unit in the Bachelor of Architecture, Swinburne University of Technology, in '
        + 'collaboration with Mond Qu, Sonny Do and Edward Yee from United Make, Protolab '
        + 'and Daniel Prohasky. The unit was conceived by Associate Professor John Sadar.',

    // The drawer's text: the unit (the user's description), then the exhibition - rephrased (approved, "Use 1")
    body: [
        'Future Gardens was part of a unit within the Bachelor of Architecture at '
        + 'Swinburne University of Technology, in collaboration with the studio United '
        + 'Make. The students didn\'t only design: they built real objects for a real '
        + 'exhibition.',
        'The unit explores buildings as a communicative medium - as technological '
        + 'communication and human networks. Students questioned traditional and '
        + 'interactive modes of representation, looked at architectural components as '
        + 'parts of a larger system, and made virtually animated prototypes and '
        + 'communicative media, developing skills and knowledge of buildings as dynamic '
        + 'systems.',
        'By the end of the unit, students could:',
        [
            'communicate through different modes of architectural communication, '
            + 'especially those involving time;',
            'explain architectural systems and subsystems;',
            'carry ideas and design outcomes through 2, 3 and 4-dimensional modes: '
            + 'sketches, print, digital models and animation;',
            'identify points of control for sustainable, resourceful and zero-waste '
            + 'efficiencies within architectural systems.',
        ],
        'The unit contributes to Swinburne\'s graduate attributes: communication '
        + 'skills, teamwork skills and digital literacies.',
        'The Future Gardens exhibition, by United Make and Swinburne University '
        + 'students, transformed the East Wing Lobby of 530 Collins Street, Melbourne, '
        + 'into a showcase of seven futuristic design specimens. This fusion of digital '
        + 'and physical realms investigated the potential of non-fungible assets '
        + 'through science fiction and biomimicry.',
        'Visitors could touch the exhibits: digital dragonflies that react to '
        + 'temperature, symbiotic plants, and artificial roots that communicate with '
        + 'each other. Among them were the mechanical flowers, with clear acrylic '
        + 'petals that open and close, driven by a small motor and a toothed rack, '
        + 'around a glowing pleated cloth. The exhibition invited visitors to picture '
        + 'the future of gardens and design, and to open their minds to the '
        + 'possibilities of emerging technologies.',
    ],

    thumbModel: 'models/mechanism.glb',
    thumbSize: 1.6,
    detailModel: 'models/mechanism.glb',
    // The model itself, each kind of part in its own look
    solid: { lit: [222, 222, 220], shade: [160, 160, 162] },
    // Clear acrylic as in the user's photo: see-through, every part outlined but the rack; the motor dark
    parts: {
        petal: { lit: [244, 242, 255], shade: [196, 190, 228], opacity: 0.3, edges: true },
        rack: { lit: [236, 244, 238], shade: [150, 190, 160], opacity: 0.5 },
        frame: { lit: [244, 242, 255], shade: [160, 154, 204], opacity: 0.45, edges: true },
        motor: { lit: [96, 96, 104], shade: [44, 44, 50], edges: true },
        screws: { lit: [214, 214, 220], shade: [160, 160, 170], edges: true },
    },
    // The petals turn, the rack slides: by itself, a cycle in 10 seconds, or by the slider
    mechanism: {
        loop: 8,
        // Cloth between the petals, glowing lavender as in the photo
        cloth: { of: 'petal', lit: [236, 230, 255], shade: [176, 160, 236], opacity: 0.5 },
    },
    doubleClick: 'none',
    // Opens looking steeply down into the closed model, close, while it opens and closes 3 times
    // (8s each), then close on the hub for 2 more; then the camera pulls out to the view itself and
    // the model turns once round, in 40s; then it moves back in and starts again
    view: {
        elevation: 22, turn: 20, zoom: { side: 1.1, stacked: 1.4 },
        // Two shots, 5s between them: steeply from above, then close on the hub from the side (the
        // gears and the rack, the user's phone screenshot); the second only 2 cycles
        flight: {
            over: 5,
            shots: [
                { view: { elevation: 78, zoom: { side: 1.9, stacked: 2.2 } }, cycles: 3 },
                { view: { elevation: 12, zoom: { side: 4.2, stacked: 5.5 }, lift: { side: 0.1, stacked: 0.12 } }, cycles: 2 },
            ],
        },
        spin: 40,
        // With the drawer out (wide screens): steeply from above, down into the open model (the user's screenshot)
        drawerView: { elevation: 80, zoom: { side: 1.9 } },
    },
    // After the pictures: the students, as the user lists them
    credits: 'Students: Anna, Nathan, Brianna, Jade, Nader, Amy, Emma, Jessica, Hameeda, '
        + 'Nadine, Farah, Maria, Zoe, Aish, Matt, Joel, Josh, Mietta, Tanesha, Sunalika, '
        + 'Untu & Habashi',
    // The exhibition: the lobby first, then the flower and a dragonfly close up, then the lobby again
    images: [
        {
            src: 'images/future-gardens-01.jpg',
            alt: 'The Future Gardens exhibition on a black platform in the lobby: white pots of tropical plants, glowing white paper flowers among the leaves, a visitor in the corner',
            ratio: '3 / 2',
        },
        {
            src: 'images/future-gardens-02.jpg',
            alt: 'A visitor\'s hand reaching for a mechanical flower: its pleated white cloth glowing lavender on clear acrylic petals, among plants',
            ratio: '3 / 2',
        },
        {
            src: 'images/future-gardens-03.jpg',
            alt: 'Digital dragonflies: frosted acrylic wings on tiers of a clear acrylic tower rising from a pot of soil, a hand beside it',
            ratio: '3 / 2',
        },
        {
            src: 'images/future-gardens-04.jpg',
            alt: 'More of the exhibition: white pots on the platform, red and white mechanical shells among the ferns, a small screen, visitors talking behind',
            ratio: '3 / 2',
            wide: true,
        },
    ],
});
