import { defineProject } from './schema.js';

/**
 * Robots and students - a teaching project. Everything but the title is a
 * stand-in until the user sends the real thing: the model is Rock Print
 * Pavilion's, the text obviously fake, the year and role empty.
 */
export default defineProject({
    id: 'robots-and-students',
    slot: 5,
    title: 'Robots and students',
    category: 'teaching',

    body: [
        'Placeholder text - the real description is still to come.',
    ],

    // Stand-in: Rock Print Pavilion's model, until this project has its own
    thumbModel: 'models/rock.gltf',
    detailModel: 'models/RockPrintStructureReduced.glb',
    view: {
        elevation: 58,
        azimuth: 4,
        turn: 94,
        zoom: { stacked: 1.75, side: 1.4 },
        lift: { stacked: 0.14, side: 0 },
    },
    gather: true,
    doubleClick: 'hold',
});
