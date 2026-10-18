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
 *   body          /   array of paragraph strings; [words](https://...) is a link
 *   credits       collaborators, and any research group to credit
 *   category      'research', 'teaching' or 'real-world' - see CATEGORIES
 *   thumbModel    the small model shown in the catalog pebble
 *   thumbSize     fit thumbModel to this longest side (the pebble is 4.4
 *                 across at size 1); without it the model is drawn as-is
 *   detailModel   the .glb loaded on click: a point cloud, or a plain mesh
 *                 sampled into points as it loads
 *   view          camera angle in degrees - see normaliseView
 *   gather        points gather from a scattered cloud on open
 *   points        a mesh detailModel only: how many points to sample
 *   solid         a mesh detailModel only: drawn as the mesh itself in the
 *                 inks, not sampled into points; or { lit, shade } as screen
 *                 [r, g, b] for its own colour, lit side and turned away
 *   still         the model doesn't turn by itself (it can still be orbited)
 *   screenVideo   with screen: a film (.mp4 in static/) playing on it, muted, looping
 *   phone         with screen: { detailModel, screenVideo } shown instead on a
 *                 narrow screen (the stacked layout, under 860px)
 *   orbit         false: the visitor can't orbit or wheel-zoom the view by hand
 *   screen        with solid: the name of the model's screen mesh (X across,
 *                 Y up, Z out of it); the pebble's points settle there and float
 *   doubleClick   what a double-click/double-tap on the model does: 'zoom'
 *                 (the default) in and back out, 'hold' stops its turn until
 *                 the next, 'drop' drops it again (with a `drop`), 'none'
 *                 nothing (and no hint for it)
 *   autoZoom      seconds: the camera moves in on the model, or back out, this often
 *   eyeLevel      with autoZoom: two of every three moves in are from inside,
 *                 at this share of the model's height - the second turned round
 *   drop          a crossed-rod mesh only: copies dropped with live physics
 *   images        drawer pictures - see normaliseImage
 *   videos        drawer films, embedded from Vimeo - see normaliseVideo
 *
 * See CLAUDE.md ("Adding or editing a project") for the prose version, and
 * src/projects/rock-print.js for a worked example.
 */

// The grid always holds this many pebbles, whatever the viewport, so no
// project is ever unreachable. Raise it before adding an eleventh project.
export const SLOT_COUNT = 10;

// The thumbnail inside a project's pebble when it names none of its own; a
// slot with no project yet holds nothing
const DEFAULT_THUMB = 'models/rock.gltf';

/**
 * The kinds of project, in the order the catalog's filter lists them. Every
 * project is one (`category`), shown as a tag in its bar; the catalog can
 * bring one kind forward and sink the rest.
 */
export const CATEGORIES = [
    { id: 'research', label: 'Research' },
    { id: 'teaching', label: 'Teaching' },
    { id: 'real-world', label: 'The real world' },
];

export function categoryLabel(id) {
    return CATEGORIES.find((category) => category.id === id)?.label ?? '';
}

/**
 * Which kind each empty slot stands in for until a project fills it, so the
 * filter has something to show for every kind. Mixed through the grid rather
 * than in blocks, so a kind brought forward isn't just a row.
 */
export const EMPTY_SLOT_CATEGORIES = {
    2: 'teaching', 4: 'real-world', 5: 'teaching',
    6: 'teaching', 7: 'real-world', 8: 'real-world', 9: 'teaching',
};

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
        // Two to a row on a phone too, where pictures otherwise run one to a
        // row - for tall phone screenshots, too big at full width
        pair: Boolean(image.pair),
    };
}

/**
 * A film in the drawer, above the pictures: embedded from Vimeo by its
 * number - the digits in vimeo.com/148494213, never a link's long
 * `?turnstile=` part, which is one visitor's session. `title` names the
 * player for screen readers; `ratio` is the film's width / height.
 */
function normaliseVideo(video, { id, index }) {
    if (!video || !/^\d+$/.test(String(video.vimeo ?? ''))) {
        throw new Error(`Project "${id}": videos[${index}] needs a vimeo number, like '148494213'`);
    }

    return {
        vimeo: String(video.vimeo),
        title: video.title ?? '',
        caption: video.caption ?? '',
        ratio: video.ratio || '16 / 9',
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

function normaliseDoubleClick({ id, doubleClick = 'zoom', drop }) {
    if (!['zoom', 'hold', 'drop', 'none'].includes(doubleClick)) {
        throw new Error(`Project "${id}": doubleClick should be 'zoom', 'hold', 'drop' or 'none'`);
    }
    if (doubleClick === 'drop' && !drop) throw new Error(`Project "${id}": doubleClick 'drop' needs a drop`);
    return doubleClick;
}

// Not with a `drop`, whose own close-ups (`drop.closeUp`) move the camera
function normaliseAutoZoom(autoZoom, { id, drop }) {
    if (autoZoom === undefined) return undefined;
    if (!(autoZoom > 0)) throw new Error(`Project "${id}": autoZoom should be a number of seconds above 0`);
    if (drop) throw new Error(`Project "${id}": autoZoom can't go with a drop`);
    return autoZoom;
}

// A solid model has no points to gather, sample or drop
function normaliseSolid({ id, solid, gather, points, drop }) {
    if (!solid) return false;
    if (gather || points !== undefined || drop) throw new Error(`Project "${id}": solid can't go with gather, points or drop`);
    if (solid === true) return true;
    const rgb = (value) => value === undefined
        || (Array.isArray(value) && value.length === 3 && value.every((n) => n >= 0 && n <= 255));
    if (typeof solid !== 'object' || !rgb(solid.lit) || !rgb(solid.shade)) {
        throw new Error(`Project "${id}": solid should be true or { lit, shade } as [r, g, b], 0-255`);
    }
    return { lit: solid.lit, shade: solid.shade };
}

function normaliseScreen({ id, screen, solid }) {
    if (screen === undefined) return undefined;
    if (!screen || typeof screen !== 'string') throw new Error(`Project "${id}": screen should be the name of a mesh in the model`);
    if (!solid) throw new Error(`Project "${id}": screen needs solid`);
    return screen;
}

function normaliseScreenVideo({ id, screenVideo, screen }) {
    if (screenVideo === undefined) return undefined;
    if (!screenVideo || typeof screenVideo !== 'string') throw new Error(`Project "${id}": screenVideo should be a path, like 'videos/x.mp4'`);
    if (!screen) throw new Error(`Project "${id}": screenVideo needs screen`);
    return screenVideo;
}

function normalisePhone({ id, phone, screen }) {
    if (phone === undefined) return undefined;
    if (!phone || typeof phone !== 'object' || !phone.detailModel) {
        throw new Error(`Project "${id}": phone should be { detailModel, screenVideo }`);
    }
    if (!screen) throw new Error(`Project "${id}": phone needs screen - its model's screen mesh has the same name`);
    if (phone.screenVideo !== undefined && typeof phone.screenVideo !== 'string') {
        throw new Error(`Project "${id}": phone.screenVideo should be a path, like 'videos/x.mp4'`);
    }
    return { detailModel: phone.detailModel, screenVideo: phone.screenVideo };
}

function normaliseEyeLevel({ id, eyeLevel, autoZoom }) {
    if (eyeLevel === undefined) return undefined;
    if (!(eyeLevel > 0 && eyeLevel < 1)) throw new Error(`Project "${id}": eyeLevel should be a share of the height, between 0 and 1`);
    if (!autoZoom) throw new Error(`Project "${id}": eyeLevel needs autoZoom`);
    return eyeLevel;
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

    if (!CATEGORIES.some((category) => category.id === project.category)) {
        throw new Error(`Project "${id}": category should be one of ${CATEGORIES.map((c) => `'${c.id}'`).join(', ')}`);
    }

    const body = project.body ?? [];

    if (!Array.isArray(body)) {
        throw new Error(`Project "${id}": body should be an array of paragraph strings`);
    }

    const images = project.images ?? [];

    if (!Array.isArray(images)) {
        throw new Error(`Project "${id}": images should be an array`);
    }

    const videos = project.videos ?? [];

    if (!Array.isArray(videos)) {
        throw new Error(`Project "${id}": videos should be an array`);
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

        thumbModel: project.thumbModel ?? DEFAULT_THUMB,
        thumbSize: project.thumbSize,
        detailModel: project.detailModel,

        view: normaliseView(project.view, { id }),
        category: project.category,
        gather: Boolean(project.gather),
        points: project.points,
        solid: normaliseSolid(project),
        still: Boolean(project.still),
        orbit: project.orbit !== false,
        screen: normaliseScreen(project),
        screenVideo: normaliseScreenVideo(project),
        phone: normalisePhone(project),
        doubleClick: normaliseDoubleClick(project),
        autoZoom: normaliseAutoZoom(project.autoZoom, project),
        eyeLevel: normaliseEyeLevel(project),
        drop: normaliseDrop(project.drop, { id }),

        images: images.map((image, index) => normaliseImage(image, { id, index })),
        videos: videos.map((video, index) => normaliseVideo(video, { id, index })),
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
        && (metaRows(project).length || project.credits || project.body.length
            || project.images.length || project.videos.length)
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
