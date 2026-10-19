/**
 * The catalog: the single source of truth for which projects exist and
 * where they sit.
 *
 * Adding a project is two steps and nothing else:
 *
 *   1. write src/projects/<id>.js, exporting `defineProject({ ... })`
 *   2. add it to the `catalog` array below
 *
 * Everything downstream - the pebble it gets, its thumbnail, the model
 * loaded on click, its drawer, whether it has a drawer at all - follows from
 * the one declaration, because the engine and the UI both read the
 * normalised project rather than reaching for fields of their own. There is
 * no per-project branch anywhere: a project that wants different behaviour
 * says so in its own file through `view`, `gather`, `drop`, `points`,
 * `doubleClick`, `autoZoom` or `eyeLevel`.
 *
 * Slots with no project listed here render as empty pebbles, holding
 * nothing and answering a click with "under construction".
 */
import { EMPTY_SLOT_CATEGORIES, SLOT_COUNT, pebbleLabel } from './schema.js';
import rockPrint from './rock-print.js';
import emergentSpace from './emergent-space.js';
import khReuse from './kh-reuse.js';
import napNapHooray from './nap-nap-hooray.js';

export { CATEGORIES, categoryLabel, hasDescription, metaRows } from './schema.js';

const catalog = [
    rockPrint,
    emergentSpace,
    khReuse,
    napNapHooray,
];

/**
 * Two projects in the same slot would silently hide one of them, with
 * nothing on screen to say which - so say it here instead.
 */
function bySlot(list) {
    const map = new Map();

    list.forEach((project) => {
        const taken = map.get(project.slot);

        if (taken) {
            throw new Error(
                `Slot ${project.slot} is claimed by both "${taken.id}" and "${project.id}"`
            );
        }

        map.set(project.slot, project);
    });

    return map;
}

const projectBySlot = bySlot(catalog);

/**
 * What the engine needs to build the grid: how many pebbles, and what (if
 * anything) sits in each. Passed in rather than imported by the engine, so
 * the engine knows nothing about this project's own content.
 */
export const catalogSource = {
    slotCount: SLOT_COUNT,
    projectBySlot,
    label: pebbleLabel,
    // Which kind of project a slot holds - its project's, or the kind an
    // empty slot stands in for - for the catalog's filter to compare
    categoryOf: (slot) => projectBySlot.get(slot)?.category ?? EMPTY_SLOT_CATEGORIES[slot] ?? null,
};
