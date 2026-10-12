/**
 * The shape of a project.
 *
 * Every project in the catalog goes through `defineProject`, so there is one
 * place that says what a project may declare, what it defaults to and what
 * counts as a mistake - rather than ten entries in an array each trusted to
 * be written correctly. The engine and the drawer both read the normalised
 * result, so neither has to guess at a half-filled entry.
 *
 * Fields, all optional but `id`, `slot`, `title` and `detailModel`:
 *
 *   id            stable identifier; also the key "visited" is remembered under
 *   slot          fixed grid position, 0-based, row-major; unique, < SLOT_COUNT
 *   title         also the name that hangs under the glowing pebble, so keep
 *                 it short enough for a phone
 *   year          \
 *   role           |  shown in the drawer if non-empty. State the role
 *   context        |  accurately - the page implies authorship
 *   body          /   array of paragraph strings
 *   credits       collaborators, and any research group to credit
 *   thumbModel    the small model shown in the catalog pebble
 *   thumbSize     fit thumbModel to this longest side (the pebble is 4.4
 *                 across at size 1); without it the model is drawn as-is
 *   detailModel   the .glb loaded on click: a point cloud, or a plain mesh
 *                 sampled into points as it loads
 *   view          camera angle in degrees - see normaliseView
 *   gather        points gather from a scattered cloud on open
 *   points        a mesh detailModel only: how many points to sample
 *   zoom          false: no double-click/double-tap zoom, and no hint for it
 *   autoZoom      seconds: the camera moves in on the model, or back out, this often
 *   drop          a crossed-rod mesh only: copies dropped with live physics
 *   images        drawer pictures - see normaliseImage
 *
 * See CLAUDE.md ("Adding or editing a project") for the prose version, and
 * src/projects/rock-print.js for a worked example.
 */

// The grid always holds this many pebbles, whatever the viewport, so no
// project is ever unreachable. Raise it before adding an eleventh project.
export const SLOT_COUNT = 10;

// The thumbnail for a slot with no project yet - every pebble gets something
// inside it, so the grid reads as full rather than as one find among blanks
export const EMPTY_SLOT_THUMB = 'models/rock.gltf';

const DEFAULT_IMAGE_RATIO = '3 / 2';

// The meta rows the drawer shows, in order. One list, so the drawer and
// `hasDescription` can never disagree about what counts as described.
const META_FIELDS = [
    ['Year', 'year'],
    ['Role', 'role'],
    ['Context', 'context'],
];

/**
 * One picture in the drawer. The first spans the drawer's width, the rest sit
 * two to a row unless `wide` (diagrams whose text is unreadable at half).
 * An entry with no `src` is deliberate: it shows as an empty dashed frame,
 * holding its place.
 */
function normaliseImage(image, { id, index }) {
    if (!image || typeof image !== 'object') {
        throw new Error(`Project "${id}": images[${index}] should be an object`);
    }

    return {
        src: image.src ?? '',
        alt: image.alt ?? '',
        caption: image.caption ?? '',
        // The file's own width / height, as a CSS aspect ratio
        ratio: image.ratio || DEFAULT_IMAGE_RATIO,
        wide: Boolean(image.wide),
    };
}

/**
 * A project's camera angle, in degrees. Left out, the project is framed
 * square-on by the detail view's default.
 *
 *   elevation  above the horizon
 *   azimuth    around the model - keep it small (see DECISIONS.md)
 *   turn       how far the model is spun round when it first appears, before
 *              its slow rotation carries on from there
 *   zoom       closer than fitting the pebble; a number, or per layout
 *   lift       raised on screen, as a share of its height; number or per layout
 *   sway       the camera nods this many degrees up and back down, slowly
 *
 * Only the keys a project gave are kept: the engine's own `?? 0` fallbacks
 * stay the single source of each default, so normalising can't quietly
 * change a shot that was fitted to a screenshot.
 */
function normaliseView(view, { id }) {
    if (view === undefined) return undefined;

    if (typeof view !== 'object' || view === null) {
        throw new Error(`Project "${id}": view should be an object of degrees`);
    }

    return { ...view };
}

/**
 * Copies of a rod-built mesh dropped onto a surface with real physics
 * (src/engine/pile.js). `size` is each copy's longest side and `ground` the
 * surface's height, both in the pebble's units (5 across, centred on 0);
 * `solid` draws the mesh itself rather than points.
 */
function normaliseDrop(drop, { id }) {
    if (drop === undefined) return undefined;

    if (typeof drop !== 'object' || drop === null) {
        throw new Error(`Project "${id}": drop should be an object`);
    }

    // `repeat`: drop again this many seconds after each drop comes to rest
    if (drop.repeat !== undefined && !(drop.repeat > 0)) {
        throw new Error(`Project "${id}": drop.repeat should be a number of seconds above 0`);
    }

    /**
     * `closeUp`: once each drop is at rest, the camera moves in on one of the
     * interlocks (so it needs `contacts`), stays `hold` seconds, moves back
     * out, and drops again `after` seconds later - in place of `repeat`
     */
    if (drop.closeUp !== undefined) {
        const { hold, after } = drop.closeUp ?? {};
        if (!drop.contacts) {
            throw new Error(`Project "${id}": drop.closeUp needs drop.contacts`);
        }
        if (drop.repeat !== undefined) {
            throw new Error(`Project "${id}": drop.closeUp sets when it drops again, so leave out drop.repeat`);
        }
        if (!(hold > 0) || !(after >= 0)) {
            throw new Error(`Project "${id}": drop.closeUp should be { hold, after } in seconds, hold above 0`);
        }
    }

    return { ...drop };
}

// Not with a `drop`, whose own close-ups (`drop.closeUp`) move the camera
function normaliseAutoZoom(autoZoom, { id, drop }) {
    if (autoZoom === undefined) return undefined;
    if (!(autoZoom > 0)) throw new Error(`Project "${id}": autoZoom should be a number of seconds above 0`);
    if (drop) throw new Error(`Project "${id}": autoZoom can't go with a drop`);
    return autoZoom;
}

export function defineProject(project) {
    if (!project || typeof project !== 'object') {
        throw new Error('A project should be an object');
    }

    const { id, slot, title } = project;

    if (!id || typeof id !== 'string') {
        throw new Error('A project needs a string id');
    }

    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) {
        throw new Error(`Project "${id}": slot should be an integer 0..${SLOT_COUNT - 1}, not ${slot}`);
    }

    if (!title || typeof title !== 'string') {
        throw new Error(`Project "${id}": needs a title - it is also the name on its pebble`);
    }

    if (!project.detailModel) {
        throw new Error(`Project "${id}": needs a detailModel, the .glb opened on click`);
    }

    const body = project.body ?? [];

    if (!Array.isArray(body)) {
        throw new Error(`Project "${id}": body should be an array of paragraph strings`);
    }

    const images = project.images ?? [];

    if (!Array.isArray(images)) {
        throw new Error(`Project "${id}": images should be an array`);
    }

    return {
        id,
        slot,
        title,

        // Anything left empty is skipped rather than rendered blank
        year: project.year ?? '',
        role: project.role ?? '',
        context: project.context ?? '',
        body,
        credits: project.credits ?? '',

        thumbModel: project.thumbModel ?? EMPTY_SLOT_THUMB,
        thumbSize: project.thumbSize,
        detailModel: project.detailModel,

        view: normaliseView(project.view, { id }),
        gather: Boolean(project.gather),
        points: project.points,
        zoom: project.zoom !== false,
        autoZoom: normaliseAutoZoom(project.autoZoom, project),
        drop: normaliseDrop(project.drop, { id }),

        images: images.map((image, index) => normaliseImage(image, { id, index })),
    };
}

/**
 * Nothing written yet means nothing to pull out, so the drawer gets no
 * handle at all - a project with no description is a legitimate state, not a
 * half-finished one.
 */
export function hasDescription(project) {
    return Boolean(
        project
        && (metaRows(project).length || project.credits || project.body.length || project.images.length)
    );
}

// The drawer's definition list, with the empty rows already dropped
export function metaRows(project) {
    if (!project) return [];

    return META_FIELDS
        .map(([label, field]) => ({ label, value: project[field] }))
        .filter((row) => Boolean(row.value));
}

// What hangs under a pebble: a project's own name, or the slot's number
export function pebbleLabel({ project, slot }) {
    return project?.title ?? `Project ${String(slot + 1).padStart(2, '0')}`;
}
