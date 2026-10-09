import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import GUI from 'lil-gui'
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { createPile, findRods, loadPhysics, PILE_SURFACE_RADIUS } from './pile.js';

import gatherGlsl from './shaders/pointCloud/gather.glsl';
import pointCloudVertexShader from './shaders/pointCloud/vertex.glsl';
import pointCloudFragmentShader from './shaders/pointCloud/fragment.glsl';

import trailCornerGlsl from './shaders/trail/corner.glsl';
import trailGatherVertexShader from './shaders/trail/gatherVertex.glsl';
import trailGatherFragmentShader from './shaders/trail/gatherFragment.glsl';

import smokeVertexShader from './shaders/smoke/vertex.glsl';
import smokeFragmentShader from './shaders/smoke/fragment.glsl';

/**
 * Debug
 */
// const gui = new GUI()

/**
 * Canvas
 */
const canvas = document.querySelector('canvas.webgl');

/**
 * Sizes
 */
let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;
let aspectRatio = screenWidth / screenHeight;
const cubeSize = 5;
const spacing = 1.4; // centre to centre, in cubeSizes - 1.2 felt crowded

/**
 * Catalog slots
 *
 * The grid always holds SLOT_COUNT cubes, whatever the viewport. The viewport
 * only decides how they are arranged, so no project is ever unreachable.
 */
const SLOT_COUNT = 10;

// The cubes' faces are tinted glass over the paper: mostly see-through at
// rest, filling in when hovered or glowing
const CUBE_FACE_OPACITY = 0.14;
const SPOTLIGHT_FACE_OPACITY = 0.6; // at the peak of a beat

/**
 * Colors 
 */
// Scene colours are given as the values they should show on screen. The
// renderer outputs linear values straight to the screen, and a hex string
// is converted towards linear on the way in, which darkens and shifts it -
// so these bypass that. See DECISIONS.md.
const screenColor = (r, g, b) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.LinearSRGBColorSpace);

// On the paper ground (--bg in styles.css): the cubes are faintly tinted
// glass (see CUBE_FACE_OPACITY) with ink edges in the deep teal of --accent
const cubesColor = screenColor(120, 150, 158);
const selectedCubeColor = screenColor(31, 95, 107);

// A pebble whose project has been opened stays darker, like a visited link:
// deeper glass and a darker rim. Remembered in the browser, so it's still
// darker on the next visit (where storage is allowed - it's a nicety, not
// state anything depends on).
const visitedCubeColor = screenColor(70, 102, 114);
const visitedRimColor = screenColor(14, 48, 56);
const VISITED_FACE_OPACITY = 0.24;
const VISITED_KEY = 'fluxandflow.visited';
const visitedProjects = loadVisited();

function loadVisited() {
    try {
        return new Set(JSON.parse(window.localStorage.getItem(VISITED_KEY)) || []);
    } catch {
        return new Set();
    }
}

function markVisited(cube) {
    cube.userData.visited = true;

    const id = cube.userData.project?.id;
    if (!id || visitedProjects.has(id)) return;

    visitedProjects.add(id);
    try {
        window.localStorage.setItem(VISITED_KEY, JSON.stringify([...visitedProjects]));
    } catch {
        // Private browsing or blocked storage: darker for this visit only
    }
}

// What a pebble rests at - every state that returns a pebble to rest, or
// glows from rest, starts from these
function restingFaceColor(cube) {
    return cube.userData.visited ? visitedCubeColor : cubesColor;
}

function restingFaceOpacity(cube) {
    return cube.userData.visited ? VISITED_FACE_OPACITY : CUBE_FACE_OPACITY;
}

function restingRimColor(cube) {
    return cube.userData.visited ? visitedRimColor : selectedCubeColor;
}

// The spotlight's glow colour - the same orange as the drawer's pull
// handle (--warm in styles.css), distinct from the teal the grid otherwise
// rests at, so a jumping cube reads as "look at me" and not as a different
// flavour of idle
const spotlightGlowColor = screenColor(255, 140, 50);

// The point clouds' inks: every point is given one of these at random when
// its cloud loads, in these proportions - see the point cloud fragment shader
const POINT_INKS = [
    { color: screenColor(128, 24, 36), share: 1 / 3 }, // dark red
    { color: screenColor(255, 140, 50), share: 1 / 3 }, // orange - the invitation's
    { color: screenColor(120, 116, 110), share: 1 / 3 }, // warm grey
];

// Each point is also given one of these sizes at random, a third each - the
// middle one is the size every point used to be
const POINT_SIZES = [0.6, 1, 1.6];

// How much ink a point lays down at most: semi-transparent, so overlapping
// points build up depth instead of a solid surface
const POINT_OPACITY = 0.6;

/**
 * Assets
 *
 * Paths are stored without a leading slash and resolved against Vite's base
 * URL, so they keep working if the site is served from a sub-path.
 */
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`;

/**
 * Projects
 *
 * Single source of truth for the catalog. `slot` is the cube a project
 * occupies (0-based, row-major) and stays the same across reloads and
 * resizes. Slots with no project listed here render as empty cubes.
 */
const projects = [
    {
        id: 'rock-print',
        slot: 0,
        title: 'Rock Print Pavilion',

        // Fill these in and they appear in the panel automatically; anything
        // left empty is skipped rather than rendered blank. State the role
        // accurately - the page implies authorship of whatever it shows.
        //   year:    '2018'
        //   role:    what you actually did on it
        //   context: studio, course or research group
        //   body:    ['paragraph', 'paragraph']
        //   credits: collaborators, and the research group to credit
        // TEMP: placeholder text to verify the drawer renders on the live
        // site. Unmistakably fake on purpose - replace with the real copy
        // before sharing this link. See README.md.
        year: '[PLACEHOLDER YEAR]',
        role: '[PLACEHOLDER ROLE - replace before publishing]',
        context: '[PLACEHOLDER CONTEXT]',
        body: [
            '[PLACEHOLDER BODY TEXT] This paragraph exists only to verify '
            + 'that the About drawer opens, scrolls and closes correctly. '
            + 'Replace it with the real project description.',
        ],
        credits: '[PLACEHOLDER CREDITS]',

        thumbModel: 'models/rock.gltf',
        detailModel: 'models/RockPrintStructureReduced.glb',

        // Camera angle in the detail view, in degrees: elevation above the
        // horizon, azimuth around the model, and turn - how far the model
        // is spun round when it first appears, before its slow rotation
        // carries on from there. Leave any out for 0; leave `view` out
        // altogether for the square-on default. `zoom` comes in closer than
        // fitting the cube, `lift` raises the model on screen (a share of
        // its height); each can be per layout. These were fitted to a phone
        // screenshot of the shot wanted, so they reproduce it there.
        view: {
            elevation: 58,
            azimuth: 4,
            // 118 in the screenshot, minus the 24 the model turns while its
            // points gather (GATHER_DURATION at DETAIL_ROTATE_SPEED), so the
            // shot is what's on screen as the gather completes
            turn: 94,
            zoom: { stacked: 1.75, side: 1.4 },
            lift: { stacked: 0.14, side: 0 },
            // Once the points have gathered, the camera slowly nods this many
            // degrees up and back down past the view while the model turns
            sway: 13,
        },

        // Each time the project opens, its points start out scattered and
        // slowly gather into the pavilion - see GATHER_DURATION
        gather: true,

        // Pictures in the About drawer, in order: the first spans the full
        // width, the rest sit two to a row. An entry with no `src` yet shows
        // as an empty frame, holding its place. Paths are like the models'
        // (e.g. 'images/rock-print-1.jpg', in static/). `ratio` is optional,
        // as a CSS aspect ratio, '3 / 2' if left out.
        //   { src: '', alt: 'what it shows', caption: '', ratio: '4 / 5' }
        images: [
            {
                src: 'images/rock-print-01-exterior.jpg',
                alt: 'The pavilion under a chestnut tree beside a stone church: columns of loose stone holding up a thin rusted steel roof',
                caption: '',
                ratio: '1500 / 1122',
            },
            {
                src: 'images/rock-print-02-inside.jpg',
                alt: 'Inside the pavilion, a visitor walks between the stone columns, blurred in motion',
                caption: '',
                ratio: '900 / 589',
            },
            {
                src: 'images/rock-print-03-printing.jpg',
                alt: 'A robotic arm on a tracked vehicle lays stone and thread layer by layer as a column rises, watched by an operator',
                caption: '',
                ratio: '900 / 601',
            },
            {
                src: 'images/rock-print-04-touch.jpg',
                alt: 'A visitor touches a column, its surface of loose stones bound by thread',
                caption: '',
                ratio: '900 / 601',
            },
            {
                src: 'images/rock-print-05-detail.jpg',
                alt: 'Close-up of the columns: crushed stone held together by loops of white thread, with a blue line running through',
                caption: '',
                ratio: '900 / 601',
            },
        ],
    },
    {
        id: 'emergent-space',
        slot: 1,
        title: 'Emergent Space',

        // TEMP: placeholder text so the About drawer exists - unmistakably
        // fake on purpose, to be replaced with the real copy. State the
        // role accurately. See README.md.
        year: '[PLACEHOLDER YEAR]',
        role: '[PLACEHOLDER ROLE - replace before publishing]',
        context: '[PLACEHOLDER CONTEXT]',
        body: [
            '[PLACEHOLDER BODY TEXT] A description of Emergent Space goes '
            + 'here: the designed aggregate, how the pieces interlock, and '
            + 'what the project explores.',
        ],
        credits: '[PLACEHOLDER CREDITS]',

        // All across the drawer's full width (`wide`) - three are diagrams
        // whose text is unreadable at half
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
        // side (units; the pebble is 4.4 across) - see addContentToCube
        thumbModel: 'models/aggregate.glb',
        thumbSize: 1.9,
        // A plain mesh, not a point cloud: its surface is sampled into
        // points as it loads (see pointsFromMeshes)
        detailModel: 'models/aggregate.glb',
        // Framed on its cube, so the pile stays in frame as it turns, and
        // seen from above enough to read the surface and how they interlock
        view: { elevation: 30, zoom: { side: 1.5, stacked: 1.05 } },
        // Fewer than a mesh gets by default - its arms are thin, and more
        // read as solid rods rather than a cloud. Per aggregate.
        points: 8000,
        // Three copies dropped onto a surface with real physics, every time
        // it opens, tumbling into one another until they settle - then the
        // pile turns. `size` is each aggregate's longest side and `ground`
        // the surface's height, both in the cube's units (5 across, centred
        // on 0). See src/pile.js.
        drop: { count: 3, size: 3, ground: -1.2, solid: true },
    },
];

/**
 * How much of the viewport the project panel covers, per layout. These mirror
 * --panel-fraction in styles.css and the 859px breakpoint there; the detail
 * camera frames the model into whatever space the panel leaves free.
 */
const PANEL_FRACTION = { side: 0.42, stacked: 0.58 };
const SIDE_PANEL_QUERY = '(min-width: 860px)';

// The drawer only takes room once it is pulled out, so a closed drawer
// leaves the model the whole canvas
function getPanelLayout() {
    const mode = window.matchMedia(SIDE_PANEL_QUERY).matches ? 'side' : 'stacked';

    return { mode, fraction: drawerOpen ? PANEL_FRACTION[mode] : 0 };
}

/**
 * Load test: `?cloudtest` in the address fills every slot with a copy of the
 * first project - its rock thumbnail in every cube at start-up, its point
 * cloud loaded only when that cube is clicked - each with its own downloads,
 * the way ten different projects would be. Off unless asked for - see
 * DECISIONS.md.
 */
const CLOUD_TEST = new URLSearchParams(window.location.search).has('cloudtest');

const catalogProjects = CLOUD_TEST
    ? Array.from({ length: SLOT_COUNT }, (_, slot) => ({
        ...projects[0],
        id: `${projects[0].id}-copy-${slot}`,
        slot,
        thumbModel: `${projects[0].thumbModel}?copy=${slot}`,
        detailModel: `${projects[0].detailModel}?copy=${slot}`,
    }))
    : projects;

const projectBySlot = new Map(catalogProjects.map((project) => [project.slot, project]));

// The thumbnail for a slot with no project yet - every cube gets something
// inside it, so the grid reads as full rather than as one find among blanks
const EMPTY_SLOT_THUMB = 'models/rock.gltf';

// A project's own thumbnail (`thumbSize`) is drawn in the rock's ink - its
// colour on screen - whatever the file's own material, so the grid reads
// as one set
const THUMB_INK = new THREE.MeshBasicMaterial({ color: screenColor(23, 62, 101) });

// Up here, not next to loadThumb: createPlayground() runs before that
// part of the file has executed.
// One download per file, however many cubes show it: each cube gets its own
// clone of the loaded scene (geometry and materials shared). Under
// ?cloudtest each copy has its own URL, so there it's still ten downloads.
const thumbScenes = new Map();

/**
 * Project bar and description drawer
 *
 * The bar carries only what is needed to know where you are. The description
 * lives in a drawer parked off the edge of the screen, so by default the
 * model gets the whole canvas; pulling it out hands part of that back.
 */
const bar = document.querySelector('#bar');

// Up here rather than next to updateCubeTags: animate() runs its first
// frame as soon as it's defined, before code further down has executed
const fog = document.querySelector('#fog');

// The double-tap hint - see maybeShowTapHint
const tapHint = document.querySelector('#tap-hint');
const TAP_HINT_AFTER_GATHER = 1.2; // seconds after the points have gathered before the first one
const TAP_HINT_GAP = 5; // seconds from one hint to the next
let tapHintNext = Infinity; // seconds into the model's showing (see detailRotateStartTime)
const emptyTag = document.querySelector('#empty-tag');
const cubeTagAnchor = new THREE.Vector3();
const EMPTY_TAG_DURATION = 1.6; // seconds "Still empty..." stays up after a click
const EMPTY_TAG_FADE = 0.3; // seconds of that spent fading out
let emptyTagCube = null;
let emptyTagShownAt = 0;
const spotlightTag = document.querySelector('#spotlight-tag');
const SPOTLIGHT_TAG_MIN = 0.65; // the name's opacity at the low of each blink, relative to the spotlight's strength - a pulse, never faint

// The glowing pebble's name hangs below it on a thin string, and the string
// behaves like one: a short rope of ROPE_SEGMENTS links, each point pulled
// by gravity and an uneven breeze and held to its neighbours, the tag a
// heavier weight at the end. Its top is tied to the pebble's lower edge, so
// the pebble's jump and rock send curves rippling down it, and the breeze
// keeps it alive in between. Simulated in screen pixels with memory (like
// the flow), in fixed small steps; it starts hanging straight down for each
// new pebble.
const spotlightString = document.querySelector('#spotlight-string');
const spotlightStringPaths = spotlightString.querySelectorAll('path');
const spotlightKnots = spotlightString.querySelectorAll('circle');
const TAG_KNOT_SIZE = 0.055; // the knot's radius, as a share of the pebble's radius on screen
const TAG_STRING_LENGTH = 0.8; // as a share of the pebble's radius on screen
const TAG_STRING_MIN = 22; // px
const ROPE_SEGMENTS = 10;
const ROPE_ITERATIONS = 12; // constraint passes per step - higher is less stretchy
const ROPE_STIFFNESS = 0.05; // a thread's slight resistance to bending, once a step - curves, doesn't crinkle
const TAG_WEIGHT = 2; // the tag against one point of string - light, so the string bellies in the wind
const TAG_GRAVITY = 1500; // px/s^2
const TAG_DAMPING = 0.9; // per second - swings carry on a while before settling
const TAG_BREEZE = 900; // px/s^2 at the height of a gust
const TAG_GUST = 0.35; // gusts per second, roughly - the wind rises and falls rather than blowing steadily
const TAG_WAVE_LAG = 0.35; // seconds a gust takes to travel from the knot to the tag, so it ripples down
const TAG_STEP = 1 / 120; // seconds per integration step
const TAG_MAX_SWING = 0.95; // radians (~55 degrees) the tag may swing from under the knot
const TAG_STILL = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rope = { cube: null, points: [], pivotX: 0, pivotY: 0, lastTime: 0 };
const tagPivot = new THREE.Vector3();
const tagCentre = new THREE.Vector3();
const barTitle = document.querySelector('#project-title');
const barStatus = document.querySelector('#project-status');
const projectClose = document.querySelector('#project-close');

const drawer = document.querySelector('#drawer');
const drawerHandle = document.querySelector('#drawer-handle');
const drawerTitle = document.querySelector('#drawer-title');
const drawerMeta = document.querySelector('#project-meta');
const drawerBody = document.querySelector('#project-body');
const drawerCredits = document.querySelector('#project-credits');
const drawerImages = document.querySelector('#project-images');

let drawerOpen = false;

// Whether a double-click/tap has zoomed in on the model - see toggleDetailZoom.
// Any re-framing (drawer, resize, a new project) clears it.
let detailZoomed = false;

function hasDescription(project) {
    return Boolean(
        project.year || project.role || project.context || project.credits
        || (project.body && project.body.length)
        || (project.images && project.images.length)
    );
}

function showProject(project) {
    barTitle.textContent = project.title;
    drawerTitle.textContent = project.title;
    bar.classList.add('is-open');
    bar.setAttribute('aria-hidden', 'false');

    // Only render the meta rows a project actually has
    drawerMeta.replaceChildren();
    [
        ['Year', project.year],
        ['Role', project.role],
        ['Context', project.context],
    ].forEach(([label, value]) => {
        if (!value) return;

        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        drawerMeta.append(dt, dd);
    });

    drawerBody.replaceChildren(
        ...(project.body ?? []).map((text) => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            return paragraph;
        })
    );

    drawerImages.replaceChildren(...(project.images ?? []).map(imageFigure));

    drawerCredits.textContent = project.credits ?? '';

    // Nothing written yet means nothing to pull out, so no handle appears
    const available = hasDescription(project);
    drawer.classList.toggle('is-available', available);
    drawer.setAttribute('aria-hidden', available ? 'false' : 'true');
}

// One picture in the drawer, or an empty frame holding its place
function imageFigure(image) {
    const figure = document.createElement('figure');
    figure.className = 'drawer__image';

    // Across the drawer's whole width - a diagram's text is too small at half
    if (image.wide) figure.classList.add('is-wide');

    const frame = document.createElement('div');
    frame.className = 'drawer__frame';
    frame.style.aspectRatio = image.ratio || '3 / 2';

    if (image.src) {
        const img = document.createElement('img');
        img.src = assetUrl(image.src);
        img.alt = image.alt ?? '';
        img.loading = 'lazy';
        frame.append(img);
    } else {
        figure.classList.add('is-empty');
        frame.setAttribute('aria-hidden', 'true');
    }

    figure.append(frame);

    if (image.caption) {
        const caption = document.createElement('figcaption');
        caption.textContent = image.caption;
        figure.append(caption);
    }

    return figure;
}

function hideProject() {
    setDrawer(false, { reframe: false });

    bar.classList.remove('is-open');
    bar.setAttribute('aria-hidden', 'true');
    drawer.classList.remove('is-available');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.scrollTop = 0;
}

function setDrawer(open, { reframe = true } = {}) {
    drawerOpen = open;

    drawer.classList.toggle('is-open', open);
    drawerHandle.setAttribute('aria-expanded', String(open));

    // On a narrow viewport the drawer's own header takes over the title, so
    // the bar can give that height back - see the 859px query in styles.css
    document.body.classList.toggle('drawer-open', open);

    // Opening makes room for the drawer - beside the model on a wide
    // screen, the close-up on a narrow one (see frameWithDrawerOpen);
    // closing returns to the full-fit view
    if (!reframe || !selectedCube) return;

    if (open) {
        frameWithDrawerOpen(selectedCube, { duration: 1.1 });
    } else {
        frameDetail(selectedCube, { duration: 0.8 });
    }
}

/**
 * How much of the viewport height the bar occupies, as a fraction.
 *
 * Only stacked layouts reserve it. Side-by-side the bar sits in the top-left
 * corner, clear of a model framed into the other half, so reserving its full
 * height across the whole width would shrink the model for nothing.
 */
function barFraction() {
    if (!bar.classList.contains('is-open')) return 0;

    return Math.min(bar.offsetHeight / screenHeight, 0.5);
}

function setProjectStatus(message) {
    barStatus.textContent = message ?? '';
}

/**
 * Start-up progress, reported to the loader screen in index.html
 * (window.fluxLoader). Everything the catalog needs before it's worth showing
 * registers here as it starts loading; once sealBoot() has been called and
 * every registered asset has finished - or failed, which still counts, so a
 * missing file can't hold the page hostage - the loader is told to leave.
 */
const bootAssets = [];
let bootSealed = false;
let bootFinished = false;

function bootAsset() {
    const entry = { fraction: 0, done: false };
    bootAssets.push(entry);
    reportBoot();

    return {
        progress: (event) => {
            if (event && event.lengthComputable && event.total) {
                entry.fraction = Math.min(event.loaded / event.total, 1);
                reportBoot();
            }
        },
        done: () => {
            entry.fraction = 1;
            entry.done = true;
            reportBoot();
        },
    };
}

function reportBoot() {
    const fraction = bootAssets.length
        ? bootAssets.reduce((sum, entry) => sum + entry.fraction, 0) / bootAssets.length
        : 0;

    window.fluxLoader?.progress(fraction);

    if (bootSealed && !bootFinished && bootAssets.every((entry) => entry.done)) {
        bootFinished = true;

        // Two frames on, so the catalog has actually been drawn behind the
        // loader by the time it starts to fade
        requestAnimationFrame(() => requestAnimationFrame(() => window.fluxLoader?.finish()));
    }
}

function sealBoot() {
    bootSealed = true;
    reportBoot();
}

/**
 * Loaders
 */
const textureLoader = new THREE.TextureLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(assetUrl('draco/'));

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * The gather (a project's `gather: true`): every point starts somewhere in a
 * loose cloud around the model and spirals in to its own place, at its own
 * moment, over GATHER_DURATION - the model condensing out of scattered
 * points. Done in the vertex shader from two extra attributes, a start
 * position and a delay, so it costs nothing per frame beyond one uniform.
 */
const GATHER_DURATION = 5.4; // seconds from opening the project to the last point home - 3.6 felt rushed
const GATHER_SPREAD = 0.4; // share of that over which points set off
const GATHER_SWIRL = 2.4; // radians the scatter turns through on the way in
const GATHER_SCATTER = 1.5; // scatter radius, as a multiple of the model's own half-width

/**
 * Tails: every point on its way somewhere - gathering into a model, or
 * flying out of a clicked pebble and falling into a ground - draws a tail
 * back to where it was a moment ago (shaders/trail/). Both motions are pure
 * functions of one progress uniform, so a tail just asks the same function
 * about a moment earlier: nothing is stored from frame to frame. A tail
 * shrinks to nothing as its point slows into place, and the tails are
 * switched off once the motion is over. One quad per point, drawn
 * instanced under the points.
 */
const GATHER_TRAIL = 0.15; // seconds back a gathering point's tail reaches - 0.3 read as too long
const DISSOLVE_TRAIL = 0.12; // seconds back for the dissolve's points
const TRAIL_OPACITY = 0.6; // a tail's ink at its head, as a share of its point's
const trailResolution = { value: new THREE.Vector2(1, 1) }; // the drawing buffer, set each frame

// Tails for a cloud of points: its own attributes (`names`) per instance,
// its place as aHome, and the uniforms it shares with the points - the same
// objects, so whatever drives the points drives the tails
function addTrails(points, { vertexShader, fragmentShader, names, lag }) {
    const source = points.geometry;
    const home = source.attributes.position;
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);

    // Read out as floats, whatever the cloud is stored in (quantized)
    const homes = new Float32Array(home.count * 3);
    for (let i = 0; i < home.count; i++) {
        homes[i * 3] = home.getX(i);
        homes[i * 3 + 1] = home.getY(i);
        homes[i * 3 + 2] = home.getZ(i);
    }
    geometry.setAttribute('aHome', new THREE.InstancedBufferAttribute(homes, 3));
    names.forEach((name) => {
        const attribute = source.attributes[name];
        geometry.setAttribute(name, new THREE.InstancedBufferAttribute(attribute.array, attribute.itemSize, attribute.normalized));
    });
    geometry.instanceCount = home.count;

    // The cloud's own extent, not the quad's, for anything framing the model
    if (!source.boundingBox) source.computeBoundingBox();
    if (!source.boundingSphere) source.computeBoundingSphere();
    geometry.boundingBox = source.boundingBox.clone();
    geometry.boundingSphere = source.boundingSphere.clone();

    const trails = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: points.material.depthTest,
        vertexShader,
        fragmentShader,
        uniforms: {
            ...points.material.uniforms,
            uResolution: trailResolution,
            uTrailLag: { value: lag },
            uTrailOpacity: { value: TRAIL_OPACITY },
        },
    }));
    trails.frustumCulled = false; // it moves in the shader
    trails.raycast = () => {}; // never something to click on
    trails.renderOrder = points.renderOrder - 1; // under the points
    trails.visible = false;
    points.add(trails);
    return trails;
}

// Somewhere in a flattened ball around the model, in the cloud's own space
function addGatherAttributes(geometry) {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = (Math.max(size.x, size.z) / 2) * GATHER_SCATTER;

    const count = geometry.attributes.position.count;
    const scatter = new Float32Array(count * 3);
    const delay = new Float32Array(count);
    const direction = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
        direction.randomDirection().multiplyScalar(radius * Math.cbrt(Math.random()));
        scatter[i * 3] = center.x + direction.x;
        scatter[i * 3 + 1] = center.y + direction.y * 0.55;
        scatter[i * 3 + 2] = center.z + direction.z;
        delay[i] = Math.random();
    }

    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geometry.setAttribute('aGatherDelay', new THREE.BufferAttribute(delay, 1));
}

// The handover from the clicked pebble's dissolve to the project's own
// cloud: over this long from the moment the project's points appear, they
// fade in while the dissolve's fade out, so the two clouds never sit on top
// of each other at full strength
const REVEAL_DURATION = 1; // seconds

function revealAt(since) {
    const t = Math.min(Math.max(since / REVEAL_DURATION, 0), 1);
    return t * t * (3 - 2 * t);
}

function setReveal(model, reveal) {
    model.userData.pointMaterials?.forEach((material) => {
        material.uniforms.uReveal.value = reveal;
    });
}

function setGather(model, progress) {
    // A cloud loaded without gather attributes would fly in from its origin
    if (!model.userData.gathers) return;

    model.userData.pointMaterials?.forEach((material) => {
        material.uniforms.uGather.value = progress;
    });
    // Tails while anything is still on its way
    model.userData.trails?.forEach((trails) => { trails.visible = progress < 1; });
}

/**
 * A model that arrives as a mesh rather than a point cloud - straight out of
 * Rhino or Blender - is turned into one as it loads: points scattered over
 * its surface, more where there's more surface, so it's drawn in the same
 * inks as a scanned cloud. It's also centred and scaled to fit the cube the
 * detail view frames, since a mesh comes in whatever units it was drawn in.
 * A point cloud is left exactly as it is.
 */
const MESH_SAMPLE_POINTS = 20000; // a project can ask for more or fewer (`points`)
const MESH_FIT_SIZE = cubeSize; // the model's longest side

function pointsFromMeshes(root, total = MESH_SAMPLE_POINTS) {
    root.updateMatrixWorld(true);

    const meshes = [];
    root.traverse((child) => { if (child.isMesh) meshes.push(child); });
    if (!meshes.length) return null;

    // Each mesh gets points in proportion to its surface area
    const area = (mesh) => {
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
        const position = geometry.attributes.position;
        const triangle = new THREE.Triangle();
        let total = 0;
        for (let i = 0; i < position.count; i += 3) {
            triangle.a.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
            triangle.b.fromBufferAttribute(position, i + 1).applyMatrix4(mesh.matrixWorld);
            triangle.c.fromBufferAttribute(position, i + 2).applyMatrix4(mesh.matrixWorld);
            total += triangle.getArea();
        }
        return total;
    };
    const areas = meshes.map(area);
    const totalArea = areas.reduce((sum, value) => sum + value, 0) || 1;

    const positions = new Float32Array(total * 3);
    const point = new THREE.Vector3();
    let written = 0;

    meshes.forEach((mesh, index) => {
        const count = index === meshes.length - 1
            ? total - written
            : Math.round(total * areas[index] / totalArea);
        const sampler = new MeshSurfaceSampler(mesh).build();

        for (let i = 0; i < count; i++, written++) {
            sampler.sample(point);
            point.applyMatrix4(mesh.matrixWorld);
            point.toArray(positions, written * 3);
        }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Centred on the origin, its longest side MESH_FIT_SIZE
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    const centre = geometry.boundingBox.getCenter(new THREE.Vector3());
    const factor = MESH_FIT_SIZE / (Math.max(size.x, size.y, size.z) || 1);
    geometry.translate(-centre.x, -centre.y, -centre.z);
    geometry.scale(factor, factor, factor);

    const group = new THREE.Group();
    group.add(new THREE.Points(geometry));

    // The meshes' vertices in the same space, for anything that needs the
    // shape itself rather than points on it (a pile's rods)
    const vertices = [];
    meshes.forEach((mesh) => {
        const position = mesh.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            vertices.push(new THREE.Vector3().fromBufferAttribute(position, i)
                .applyMatrix4(mesh.matrixWorld).sub(centre).multiplyScalar(factor));
        }
    });
    group.userData.vertices = vertices;

    // And the meshes themselves, merged, for drawing them solid (`drop.solid`)
    group.userData.solid = mergeGeometries(meshes.map((mesh) => {
        const solid = new THREE.BufferGeometry();
        solid.setAttribute('position', mesh.geometry.attributes.position.clone());
        if (mesh.geometry.index) solid.setIndex(mesh.geometry.index.clone());
        solid.applyMatrix4(mesh.matrixWorld);
        solid.translate(-centre.x, -centre.y, -centre.z);
        solid.scale(factor, factor, factor);
        solid.computeVertexNormals();
        return solid;
    }));
    return group;
}

/**
 * A solid model drawn in the inks rather than lit by the scene (whose cyan
 * lights would tint it): orange where it faces a fixed light from above,
 * deepening to the dark red where it turns away - like the points' inks,
 * laid on as shade. Opaque, so it hides what's behind it.
 */
function makeInkMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uLit: { value: POINT_INKS[1].color },
            uShade: { value: POINT_INKS[0].color },
        },
        vertexShader: `
varying vec3 vNormal;
void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
        fragmentShader: `
uniform vec3 uLit;
uniform vec3 uShade;
varying vec3 vNormal;
void main() {
    float light = max(dot(normalize(vNormal), normalize(vec3(-0.35, 0.8, 0.5))), 0.0);
    gl_FragColor = vec4(mix(uShade, uLit, light), 1.0);
}`,
    });
}

function loadPointCloudWithShaderMaterial({
    glbPath,
    parentObject,
    onLoaded,
    onProgress,
    onError,
    gather = false,
    points,
    drop,
}) {
    gltfLoader.load(glbPath, async (gltf) => {
        const materials = [];
        const trails = [];

        let hasPoints = false;
        gltf.scene.traverse((child) => { if (child.isPoints) hasPoints = true; });
        if (!hasPoints) {
            const sampled = pointsFromMeshes(gltf.scene, points);
            if (!sampled) {
                onError?.(new Error('No points or meshes in the model'));
                return;
            }
            gltf.scene = sampled;

            // Several copies dropped onto a surface with physics (src/pile.js)
            if (drop) {
                try {
                    const pile = await createPile({
                        template: sampled.children[0],
                        rods: findRods(sampled.userData.vertices),
                        count: drop.count ?? 3,
                        size: drop.size ?? MESH_FIT_SIZE / 2,
                        groundY: drop.ground ?? -MESH_FIT_SIZE / 4,
                        // Drawn as the solid mesh in the inks, or as points
                        solid: drop.solid ? sampled.userData.solid : null,
                        solidMaterial: drop.solid ? makeInkMaterial() : null,
                    });
                    gltf.scene = pile.group;
                    gltf.scene.userData.pile = pile;
                } catch (error) {
                    onError?.(error);
                    return;
                }
            }
        }

        gltf.scene.traverse((child) => {
            if (child.isPoints) {
                gltf.scene.userData.points ??= child;
                const geometry = child.geometry;
                if (gather) addGatherAttributes(geometry);
                const pointsCount = geometry.attributes.position.count;

                 // Ensure the color attribute exists
                //  if (!geometry.attributes.color) {
                //     const count = geometry.attributes.position.count;
                //     const colors = new Float32Array(count * 3);
                //     for (let i = 0; i < count; i++) {
                //         colors[i * 3] = Math.random();
                //         colors[i * 3 + 1] = Math.random();
                //         colors[i * 3 + 2] = Math.random();
                //     }
                //     geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                // }

                const scales = new Float32Array(pointsCount * 1);
                // const colors = new Float32Array(pointsCount * 3);

                for (let i = 0; i < pointsCount; i++) {
                    scales[i] = POINT_SIZES[Math.floor(Math.random() * POINT_SIZES.length)];
                }

                geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

                // Which ink each point is drawn in, picked at random once so
                // the speckle holds still as the model turns
                const tones = new Float32Array(pointsCount);
                for (let i = 0; i < pointsCount; i++) {
                    let pick = Math.random();
                    let tone = 0;
                    while (tone < POINT_INKS.length - 1 && pick >= POINT_INKS[tone].share) {
                        pick -= POINT_INKS[tone].share;
                        tone++;
                    }
                    tones[i] = tone;
                }
                geometry.setAttribute('aTone', new THREE.BufferAttribute(tones, 1));
                // geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                // Define a custom ShaderMaterial
                const shaderMaterial = new THREE.ShaderMaterial({
                    // Ink laid over the paper, not light added to a dark
                    // ground - additive points vanish on a light background
                    depthWrite: false,
                    depthTest: false,
                    transparent: true,
                    vertexColors: true,
                    vertexShader: gatherGlsl + pointCloudVertexShader,
                    fragmentShader: pointCloudFragmentShader,
                    uniforms:
                    {
                        // uTime: new THREE.Uniform(0),
                        uInks: { value: POINT_INKS.map((ink) => ink.color) },
                        uOpacity: { value: POINT_OPACITY },
                        uPerlinTexture: new THREE.Uniform(perlinTexture),
                        uPointScale: { value: 1 },
                        uSizeAttenuation: { value: 1 },
                        // Starts scattered if it's going to gather, home otherwise
                        uGather: { value: gather ? 0 : 1 },
                        uReveal: { value: 0 }, // see REVEAL_DURATION
                        uGatherSpread: { value: GATHER_SPREAD },
                        uGatherSwirl: { value: GATHER_SWIRL },
                    },
                });

                pointCloudMaterials.push(shaderMaterial);
                materials.push(shaderMaterial);
                refreshPointScale();

                // Replace the material with the custom ShaderMaterial
                child.material = shaderMaterial;

                if (gather) {
                    trails.push(addTrails(child, {
                        vertexShader: gatherGlsl + trailCornerGlsl + trailGatherVertexShader,
                        fragmentShader: trailGatherFragmentShader,
                        names: ['aScatter', 'aGatherDelay', 'aScale', 'aTone'],
                        lag: GATHER_TRAIL / GATHER_DURATION,
                    }));
                }
            }
        });

        gltf.scene.userData.pointMaterials = materials;
        gltf.scene.userData.trails = trails;
        gltf.scene.userData.gathers = gather;

        // Add the GLTF model to the specified parent object
        parentObject.add(gltf.scene);

        if (onLoaded) onLoaded(gltf.scene);
    }, onProgress, onError);

}

/**
 * Scene
 */
const scene = new THREE.Scene();

/**
 * Raycaster for mouse interaction
 */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(); // Declare globally

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight('#86cdff');
ambientLight.intensity = 5;
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight('#86cdff', 1);
scene.add(directionalLight)

/**
 * Cameras
 *
 * The catalog is perspective, so the cubes read as solids with depth. A
 * project is orthographic and viewed straight down an axis, so the cube's
 * edges stay parallel to the canvas and the model is drawn true to scale.
 */
const perspectiveCamera = new THREE.PerspectiveCamera(45, screenWidth / screenHeight, 1, 2000);

// near is negative so the frustum reaches behind the camera and nothing
// clips as it is moved around
const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 4000);

scene.add(perspectiveCamera, orthographicCamera);

let camera = perspectiveCamera;

/**
 * Which projection a project is shown in.
 *
 *   'perspective'  one-point perspective - the camera sits square-on to the
 *                  cube, so its vertical and horizontal edges stay parallel
 *                  to the canvas while depth converges on a single vanishing
 *                  point. DETAIL_FOV sets how strong that convergence is:
 *                  lower is flatter, higher is more dramatic.
 *   'orthographic' no convergence at all, everything true to scale.
 */
const DETAIL_PROJECTION = 'perspective';

/**
 * The lens a project is seen through, per layout. A phone's frame is narrow
 * enough that a wide angle shows the cube's top and bottom faces receding at
 * once, which reads as a tunnel rather than a box, so it gets a longer lens
 * than the desktop layout does.
 */
const DETAIL_FOV = { side: 45, stacked: 30 };
const CATALOG_FOV = 45;

// A full turn every 80s - slow enough to read as ambient rather than as
// something to watch (40s looked too fast), same spirit as the catalog's
// own wander. Turns the model itself, not the camera - see DECISIONS.md for
// why that distinction matters here.
const DETAIL_ROTATE_SPEED = (2 * Math.PI) / 80;

/**
 * How much room to leave around a project. Above 1 the whole box fits with
 * air around it; below 1 the view crops into it.
 *
 * Crop only where there is room going spare. On a phone with the drawer
 * parked, the frame is far taller than the pavilion is deep: the fit is
 * limited by width and leaves the model marooned in a thin band, so cropping
 * its sparse ends buys scale cheaply. Pull the drawer out and the free area
 * is short enough that height becomes the limit instead - the same crop would
 * take the top off the cube, so the margin eases back past 1.
 */
const DETAIL_MARGIN = { side: 1.12, stackedParked: 0.88, stackedOpen: 1.05 };

// Half the height of the orthographic frustum, in world units
let orthoHalfHeight = 1;

// Point clouds keep a constant size in world units under either projection
const pointCloudMaterials = [];
const POINT_WORLD_SIZE = 0.022;

function framebufferHeight() {
    return screenHeight * renderer.getPixelRatio();
}

// Pixels per world unit at the plane being looked at, which is what turns a
// world-space point size into a pixel size
function setPointScale(pixelsPerUnit, attenuate) {
    pointCloudMaterials.forEach((material) => {
        material.uniforms.uPointScale.value = POINT_WORLD_SIZE * pixelsPerUnit;
        material.uniforms.uSizeAttenuation.value = attenuate ? 1 : 0;
    });
}

function refreshPointScale() {
    if (camera === orthographicCamera) {
        setOrthoFrustum(orthoHalfHeight);
        return;
    }

    setPerspectivePointScale();
}

function setPerspectivePointScale() {
    const halfFov = THREE.MathUtils.degToRad(perspectiveCamera.fov) / 2;
    setPointScale(framebufferHeight() / (2 * Math.tan(halfFov)), true);
}

function setOrthoFrustum(halfHeight) {
    orthoHalfHeight = Math.max(halfHeight, 0.001);

    const halfWidth = orthoHalfHeight * aspectRatio;
    orthographicCamera.left = -halfWidth;
    orthographicCamera.right = halfWidth;
    orthographicCamera.top = orthoHalfHeight;
    orthographicCamera.bottom = -orthoHalfHeight;
    orthographicCamera.updateProjectionMatrix();

    setPointScale(framebufferHeight() / (2 * orthoHalfHeight), false);
}

function setActiveCamera(next) {
    camera = next;
    controls.object = next;
    controls.update();
}

/**
 * Orbit controls
 */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// The grid of all projects holds still under the visitor's hand - dragging
// across it stirs the cubes instead (see the flow, below). Orbiting is only
// switched on inside a project. update() still runs either way: `enabled`
// only gates input, and moveCamera relies on update() to resync.
controls.enabled = false;

// True while the visitor is orbiting by hand - the camera's sway holds off
let visitorOrbiting = false;
controls.addEventListener('start', () => { visitorOrbiting = true; });
controls.addEventListener('end', () => { visitorOrbiting = false; });

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});

renderer.setSize(screenWidth, screenHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// A shader that won't compile draws nothing at all, silently. Say so in the
// project bar, and keep the compiler's message for the browser's console.
renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
    const logs = [program, vertexShader, fragmentShader]
        .map((item) => (item === program ? gl.getProgramInfoLog(item) : gl.getShaderInfoLog(item)))
        .filter(Boolean);
    console.error('Shader error', ...logs);
    setProjectStatus('The model could not be drawn');
};

renderer.outputColorSpace = THREE.LinearSRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement);

/**
 * Smoke
*/

// Geometry
const smokeGeometry = new THREE.PlaneGeometry(20, 20, 32, 64);
// smokeGeometry.translate(0, 0, 0);
smokeGeometry.rotateX(Math.PI / 2);
// smokeGeometry.scale(1.5, 6, 1.5);

const perlinBoot = bootAsset();
const perlinTexture = textureLoader.load(assetUrl('textures/perlin.png'), perlinBoot.done, undefined, perlinBoot.done);
perlinTexture.wrapS = THREE.RepeatWrapping
perlinTexture.wrapT = THREE.RepeatWrapping


// Material
const smokeMaterial = new THREE.ShaderMaterial({
    vertexShader: smokeVertexShader,
    fragmentShader: smokeFragmentShader,
    uniforms:
    {
        uTime: new THREE.Uniform(0),
        uPerlinTexture: new THREE.Uniform(perlinTexture)
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    //    wireframe: true
})

const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial)
// scene.add(smoke);

/**
 * Background
 *
 * None in the scene: the renderer is transparent and the page's own --bg
 * (the paper, in styles.css) shows through. There used to be a three.js Sky
 * dome here with its sun just below the horizon, which is what painted the
 * near-black night behind everything - see DECISIONS.md.
 */

/**
 * Fog
 *
 * Disabled. It was configured as Fog('#04343f', 15, 8) - near beyond far -
 * which inverts it: everything NEARER than 15 units renders fully fogged and
 * everything beyond it renders clean. In the catalog the cubes sit ~29 units
 * out, so nothing was fogged and it looked fine; in a project the camera
 * comes within ~10 units, so the cube fogged out completely to a colour
 * indistinguishable from the background and its frame vanished.
 *
 * Worth bringing back deliberately for the "fog shader" idea in the README,
 * with near < far and a range that suits both views.
 */
scene.fog = null

/**
 * Playground
 */
let cubes = [];
let gridShape = { cols: 1, rows: SLOT_COUNT };
// 'catalog' | 'dropping' (the send-off after a click, before the camera
// moves) | 'detail' | 'returning' (closing, until the grid has faded back in)
let viewState = 'catalog';
let selectedCube = null; // the cube whose project is open, in detail view
let hoveredCube = null; // the cube under the cursor, in the catalog

/**
 * Ambient motion
 *
 * Each cube drifts slowly and independently instead of ticking through a
 * fixed bounce, so the grid reads as something flowing rather than
 * mechanical - the brief this project is named for. A single sine still
 * looks like a metronome no matter how its period is randomised; summing
 * two per axis, at different frequencies and phases, is a cheap stand-in
 * for noise that breaks that up without pulling in a dependency for it.
 */
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

const WANDER_Y_PERIOD_A = [8, 14]; // seconds per cycle
const WANDER_Y_PERIOD_B = [14, 24];
const WANDER_Y_AMPLITUDE_A = 1.4; // units
const WANDER_Y_AMPLITUDE_B = 0.6;
const WANDER_XZ_PERIOD = [9, 16];
const WANDER_XZ_AMPLITUDE = 0.38; // horizontal sway - well under half the gap between pebbles
const WANDER_TILT_PERIOD = [7, 12];
const WANDER_TILT = 0.05; // radians - a floating thing rocks a little as it drifts

function createWander() {
    return {
        yA: { period: randomBetween(...WANDER_Y_PERIOD_A), phase: Math.random() * Math.PI * 2 },
        yB: { period: randomBetween(...WANDER_Y_PERIOD_B), phase: Math.random() * Math.PI * 2 },
        x: { period: randomBetween(...WANDER_XZ_PERIOD), phase: Math.random() * Math.PI * 2 },
        z: { period: randomBetween(...WANDER_XZ_PERIOD), phase: Math.random() * Math.PI * 2 },
        tiltX: { period: randomBetween(...WANDER_TILT_PERIOD), phase: Math.random() * Math.PI * 2 },
        tiltZ: { period: randomBetween(...WANDER_TILT_PERIOD), phase: Math.random() * Math.PI * 2 },
    };
}

function wanderOffset(wander, elapsedTime) {
    const sine = (term) => Math.sin((elapsedTime / term.period) * Math.PI * 2 + term.phase);

    return {
        x: sine(wander.x) * WANDER_XZ_AMPLITUDE,
        y: sine(wander.yA) * WANDER_Y_AMPLITUDE_A + sine(wander.yB) * WANDER_Y_AMPLITUDE_B,
        z: sine(wander.z) * WANDER_XZ_AMPLITUDE,
        tiltX: sine(wander.tiltX) * WANDER_TILT,
        tiltZ: sine(wander.tiltZ) * WANDER_TILT,
    };
}

/**
 * Spotlight
 *
 * One cube at a time, continuously: holds where it floated, jumps - a quick
 * rock on two axes, a lift and a scale pulse on both the cube and its
 * thumbnail, edges blinking cyan to orange - for a fixed dwell, settles,
 * and hands off to another a beat later. Every cube is fair game, project
 * or empty: this is the grid feeling alive, not only an invitation to
 * click a project, though it still reads as exactly that where one exists.
 * Never the cube under the cursor, and never the one that just finished,
 * so it visibly moves rather than occasionally repeating itself.
 */
const SPOTLIGHT_GAP = [0.3, 0.6]; // seconds between one settling and the next starting
const SPOTLIGHT_DWELL = 5; // seconds a cube stays spotlighted
const SPOTLIGHT_FADE_IN = 0.6; // seconds to ramp the effect in at the start of the dwell
const SPOTLIGHT_FADE_OUT = 1.6; // and to settle back into the float at the end - slower, so it eases home
const SPOTLIGHT_FACE_GLOW = 1.0; // how strongly the face glows orange at the peak of a beat
const SPOTLIGHT_FACE_DIM = 0.9; // how far the face's own lit colour drops out at that peak
const SPOTLIGHT_PULSE_PERIOD = 1.1; // seconds per jump
const SPOTLIGHT_ROTATE_PERIOD = [1.0, 1.4]; // seconds; x and z rock at different rates
const SPOTLIGHT_ROTATE_AMPLITUDE = 0.14; // radians, ~8 degrees
const SPOTLIGHT_SCALE_AMPLITUDE = 0.18; // the thumbnail scales +/- 18% at the peak of each jump
const SPOTLIGHT_CUBE_SCALE_AMPLITUDE = 0.14; // the cube itself, kept well clear of its neighbours
const SPOTLIGHT_JUMP_HEIGHT = 0.4; // units lifted at the peak of each jump

let spotlightCube = null;
let lastSpotlightCube = null; // excluded from the next pick, so it moves on
let spotlightStartedAt = 0;
let spotlightRotatePeriodX = 0;
let spotlightRotatePeriodZ = 0;
let nextSpotlightAt = randomBetween(...SPOTLIGHT_GAP);

const spotlightEdgeColor = new THREE.Color(); // reused each frame, never reallocated
const spotlightFaceColor = new THREE.Color(); // same, for the cube's own face

/**
 * Pebbles. The catalog's objects are smooth, flattened stones rather than
 * boxes - the code still calls them cubes, and they still sit in a
 * cubeSize grid. Each is its own shape (a seeded wobble on a squashed
 * sphere), in the same pale glass. A box drew its outline with edge lines;
 * a pebble has no edges, so a second skin on the same geometry draws its
 * silhouette instead - a teal rim that is strongest where the surface turns
 * away from the eye. It answers to the same `edges.material.color` and
 * `.opacity` the edge lines did, so hover, the spotlight and every fade
 * work on it unchanged.
 */
const PEBBLE_RADIUS = cubeSize * 0.44;
const PEBBLE_SQUASH = 0.62; // height as a share of width - a stone lying flat
const PEBBLE_LUMPS = 0.06; // how far the surface wanders from round
const PEBBLE_STRETCH = 0.08; // how far each is drawn out along its own axes
const PEBBLE_DETAIL = 16; // icosphere subdivisions - smooth, still cheap to raycast
const PEBBLE_RIM_POWER = 2.4; // how tightly the rim hugs the silhouette
// Each pebble is drawn this many times PEBBLE_RADIUS across, picked at
// random on every visit - the larger ones can reach into their neighbours
const PEBBLE_SIZE_MIN = 1;
const PEBBLE_SIZE_MAX = 1.8;

/**
 * The flux: each pebble slowly changes shape - a few broad waves rolling
 * over its surface, swelling one side as another eases, never quite
 * repeating, each pebble on its own seed. Done in the vertex shader of the
 * glass and of the rim alike (the same function, so the rim stays on the
 * glass), off one shared clock - a pure function of time, nothing stored.
 * Clicking and hovering still use the resting shape, near enough.
 */
const PEBBLE_FLUX = 0.3; // how far the surface moves, as a share of the radius - 0.09 and 0.15 read as too subtle
const PEBBLE_FLUX_SPEED = 0.5; // radians a second, roughly - a wave every ~12s
const pebbleFluxTime = { value: 0 }; // shared by every pebble's materials, set each frame

const PEBBLE_FLUX_GLSL = `
uniform float uFluxTime;
uniform float uFluxSeed;
uniform float uFluxAmount;

// Three slow waves over the pebble's surface, about -1..1
float pebbleFlux(vec3 n) {
    float t = uFluxTime;
    float s = uFluxSeed;
    return (sin(n.x * 2.3 + t + s) * cos(n.z * 2.1 - t * 0.73 + s * 1.3)
        + 0.6 * sin(n.y * 3.1 + n.x * 1.7 + t * 1.27 + s * 2.1)
        + 0.4 * cos(n.z * 2.7 - n.y * 1.9 - t * 0.91 + s * 0.7)) / 2.0;
}`;

// Patches a pebble material (glass or rim) to flux, on its own seed
function addPebbleFlux(material, seed, size = 1) {
    const before = material.onBeforeCompile;

    material.onBeforeCompile = (shader, renderer) => {
        before?.(shader, renderer);
        shader.uniforms.uFluxTime = pebbleFluxTime;
        shader.uniforms.uFluxSeed = { value: seed };
        shader.uniforms.uFluxAmount = { value: PEBBLE_RADIUS * size * PEBBLE_FLUX };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>\n${PEBBLE_FLUX_GLSL}`)
            .replace('#include <begin_vertex>', [
                '#include <begin_vertex>',
                'transformed += normal * pebbleFlux(normalize(position)) * uFluxAmount;',
            ].join('\n'));
    };

    const key = material.customProgramCacheKey?.() ?? '';
    material.customProgramCacheKey = () => `${key}|pebble-flux`;
    return material;
}

function makePebbleGeometry(seed, size = 1) {
    let geometry = new THREE.IcosahedronGeometry(PEBBLE_RADIUS * size, PEBBLE_DETAIL);

    // Shared vertices, so the normals come out smooth rather than faceted
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    geometry = mergeVertices(geometry);

    const position = geometry.attributes.position;
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const stretchX = 1 + PEBBLE_STRETCH * Math.sin(seed * 3.1);
    const stretchZ = 1 + PEBBLE_STRETCH * Math.cos(seed * 1.7);

    for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        n.copy(v).normalize();

        // A few slow, overlapping waves over the sphere - a soft wobble, not noise
        const lump = Math.sin(n.x * 2.2 + seed) * Math.cos(n.y * 2.9 + seed * 1.7)
            + 0.6 * Math.sin(n.z * 3.7 + seed * 2.3) * Math.sin(n.x * 1.5 - seed)
            + 0.35 * Math.cos((n.x + n.z) * 4.6 + seed * 0.5);

        v.multiplyScalar(1 + PEBBLE_LUMPS * lump);
        position.setXYZ(i, v.x * stretchX, v.y * PEBBLE_SQUASH, v.z * stretchZ);
    }

    geometry.computeVertexNormals();
    return geometry;
}

// The rim: plain colour and opacity like any basic material, its alpha
// weighted towards the silhouette. Kept off pow(0, y), undefined in GLSL
// (see "Safari" in DECISIONS.md).
function makeRimMaterial(color) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false });

    material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vRimNormal;\nvarying vec3 vRimView;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvRimNormal = normalize(normalMatrix * normal);\nvRimView = normalize(-mvPosition.xyz);');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vRimNormal;\nvarying vec3 vRimView;')
            .replace('#include <opaque_fragment>', [
                'float rimFacing = abs(dot(normalize(vRimNormal), normalize(vRimView)));',
                `diffuseColor.a *= pow(max(1.0 - rimFacing, 0.0001), ${PEBBLE_RIM_POWER.toFixed(2)});`,
                '#include <opaque_fragment>',
            ].join('\n'));
    };
    material.customProgramCacheKey = () => 'pebble-rim';

    return material;
}

/**
 * The dissolve: a clicked pebble gives way to a cloud of points. Its glass
 * and rim fade (DISSOLVE_FADE) while points scattered over its surface
 * swell outward and turn from the rim's teal to the project's own inks,
 * then thin away - by when the project's points are gathering out of their
 * own scattered cloud, so one cloud seems to become the other. Like the
 * drop, a pure function of time since the click: one uniform a frame.
 */
const DISSOLVE_DURATION = 3.6; // seconds from the click to the last point gone - overlapping the move in and the gather
const DISSOLVE_FADE = 0.5; // seconds for the glass and rim to give way
const DISSOLVE_POINTS = 2400;
const DISSOLVE_SWELL = 0.55; // how far the cloud swells past the pebble's surface, as a share
const DISSOLVE_DRIFT = 0.9; // units each point also wanders off on its own
const DISSOLVE_POINT_SIZE = 0.07; // world units across

// Where a dissolving point is at T (0..1 of the dissolve), shared by the
// points and their tails. `falling` is how far down to a pile's ground it is
const DISSOLVE_GLSL = `
uniform float uT;
uniform float uSwell;
uniform float uGround; // 1: the points fall and stay as a pile's surface (aGround)
attribute vec3 aDrift;
attribute float aDelay;
attribute vec3 aNormal;
attribute vec3 aGround;
${PEBBLE_FLUX_GLSL}

vec3 dissolvePosition(vec3 home, float T, out float falling) {
    // From the pebble's shape at the moment it was clicked, flux and all
    vec3 start = home + aNormal * pebbleFlux(normalize(home)) * uFluxAmount;

    float t = clamp((T - aDelay) / (1.0 - aDelay), 0.0, 1.0);
    float rest = 1.0 - t;
    float swell = 1.0 - rest * rest;
    vec3 p = start * (1.0 + uSwell * swell) + aDrift * swell;

    // Or swell out, then fall - each in turn, gathering speed - to its own
    // place on the ground, and stay there
    float puff = smoothstep(0.0, 0.3, T);
    vec3 swollen = start * (1.0 + uSwell * puff) + aDrift * puff;
    falling = clamp((T - 0.25 - aDelay * 0.35) / 0.35, 0.0, 1.0);
    vec3 landed = mix(swollen, aGround, falling * falling);
    return mix(p, landed, uGround);
}

// How much ink a point lays down at T, before its tail's fade
float dissolveAlpha(float T, float falling) {
    float fading = 1.0 - smoothstep(0.55, 1.0, T);
    return smoothstep(0.0, 0.12, T) * mix(fading, 1.0 - 0.45 * falling, uGround);
}`;

const dissolveVertexShader = `
uniform float uPixelsPerUnit;
uniform float uSize;
attribute float aTone;
varying float vAlpha;
varying float vInk;
varying float vTone;
${DISSOLVE_GLSL}

void main() {
    float falling;
    vec4 mv = modelViewMatrix * vec4(dissolvePosition(position, uT, falling), 1.0);
    gl_Position = projectionMatrix * mv;
    // Landed, they're finer and fainter - a ground, not a cloud
    float settled = falling * uGround;
    gl_PointSize = uSize * (1.0 - 0.5 * settled) * uPixelsPerUnit / max(-mv.z, 0.001);

    vAlpha = dissolveAlpha(uT, falling);
    vInk = smoothstep(0.1, 0.6, uT);
    vTone = aTone;
}`;

// A dissolving point's tail (see addTrails)
const dissolveTrailVertexShader = `
uniform float uPixelsPerUnit;
uniform float uSize;
uniform float uTrailLag;
attribute vec3 aHome;
attribute float aTone;
varying float vAlpha;
varying float vInk;
varying float vTone;
${DISSOLVE_GLSL}
${trailCornerGlsl}

void main() {
    float falling;
    float before;
    vec4 headView = modelViewMatrix * vec4(dissolvePosition(aHome, uT, falling), 1.0);
    vec4 tailView = modelViewMatrix * vec4(dissolvePosition(aHome, max(uT - uTrailLag, 0.0), before), 1.0);

    float settled = falling * uGround;
    float width = uSize * (1.0 - 0.5 * settled) * uPixelsPerUnit / max(-headView.z, 0.001);
    float moving;
    gl_Position = trailCorner(headView, tailView, width, moving);

    vAlpha = (1.0 - position.x) * moving * dissolveAlpha(uT, falling);
    vInk = smoothstep(0.1, 0.6, uT);
    vTone = aTone;
}`;

const dissolveTrailFragmentShader = `
uniform vec3 uRim;
uniform vec3 uInks[3];
uniform float uOpacity;
uniform float uTrailOpacity;
varying float vAlpha;
varying float vInk;
varying float vTone;

void main() {
    vec3 ink = vTone < 0.5 ? uInks[0] : (vTone < 1.5 ? uInks[1] : uInks[2]);
    gl_FragColor = vec4(mix(uRim, ink, vInk), vAlpha * uOpacity * uTrailOpacity);
}`;

const dissolveFragmentShader = `
uniform vec3 uRim;
uniform vec3 uInks[3];
uniform float uOpacity;
varying float vAlpha;
varying float vInk;
varying float vTone;

void main() {
    float disc = 1.0 - step(0.5, distance(gl_PointCoord, vec2(0.5)));
    vec3 ink = vTone < 0.5 ? uInks[0] : (vTone < 1.5 ? uInks[1] : uInks[2]);
    gl_FragColor = vec4(mix(uRim, ink, vInk), disc * vAlpha * uOpacity);
}`;

// Built the first time a pebble is clicked, then kept for later opens
function getDissolve(cube) {
    if (cube.userData.dissolve) return cube.userData.dissolve;

    const surface = cube.geometry.attributes.position;
    const surfaceNormals = cube.geometry.attributes.normal;
    const positions = new Float32Array(DISSOLVE_POINTS * 3);
    const normals = new Float32Array(DISSOLVE_POINTS * 3);
    const drifts = new Float32Array(DISSOLVE_POINTS * 3);
    const delays = new Float32Array(DISSOLVE_POINTS);
    const tones = new Float32Array(DISSOLVE_POINTS);
    const grounds = new Float32Array(DISSOLVE_POINTS * 3);
    const v = new THREE.Vector3();

    // A project dropped onto a surface (`drop`) gets its surface from these:
    // each point's place on a disc on the ground, in the grey ink
    const drop = cube.userData.project?.drop;
    const groundRadius = drop ? (drop.size ?? 3) * PILE_SURFACE_RADIUS : 0;

    for (let i = 0; i < DISSOLVE_POINTS; i++) {
        // A point on the pebble's surface, nudged a little off it
        const vertex = Math.floor(Math.random() * surface.count);
        v.fromBufferAttribute(surface, vertex);
        v.addScalar((Math.random() - 0.5) * 0.15);
        v.toArray(positions, i * 3);
        v.fromBufferAttribute(surfaceNormals, vertex);
        v.toArray(normals, i * 3);

        v.randomDirection().multiplyScalar(DISSOLVE_DRIFT * (0.3 + 0.7 * Math.random()));
        v.toArray(drifts, i * 3);

        delays[i] = Math.random() * 0.3;
        tones[i] = drop ? 2 : Math.floor(Math.random() * 3);

        if (drop) {
            const r = Math.sqrt(Math.random()) * groundRadius;
            const a = Math.random() * Math.PI * 2;
            grounds[i * 3] = Math.cos(a) * r;
            grounds[i * 3 + 1] = drop.ground ?? 0;
            grounds[i * 3 + 2] = Math.sin(a) * r;
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aNormal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('aGround', new THREE.BufferAttribute(grounds, 3));
    geometry.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 3));
    geometry.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));
    geometry.setAttribute('aTone', new THREE.BufferAttribute(tones, 1));

    const points = new THREE.Points(geometry, new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: dissolveVertexShader,
        fragmentShader: dissolveFragmentShader,
        uniforms: {
            uT: { value: 0 },
            uSwell: { value: DISSOLVE_SWELL },
            uPixelsPerUnit: { value: 1 },
            uSize: { value: DISSOLVE_POINT_SIZE },
            uRim: { value: selectedCubeColor },
            uInks: { value: POINT_INKS.map((ink) => ink.color) },
            uOpacity: { value: POINT_OPACITY },
            uGround: { value: drop ? 1 : 0 },
            // The pebble's flux, held where it was at the click (see updateDissolve)
            uFluxTime: { value: 0 },
            uFluxSeed: { value: cube.userData.fluxSeed ?? 0 },
            uFluxAmount: { value: PEBBLE_RADIUS * cube.userData.size * PEBBLE_FLUX },
        },
    }));
    points.userData.ground = Boolean(drop);
    points.visible = false;
    points.renderOrder = 2;
    points.raycast = () => {}; // never something to click on

    points.userData.trails = addTrails(points, {
        vertexShader: dissolveTrailVertexShader,
        fragmentShader: dissolveTrailFragmentShader,
        names: ['aNormal', 'aGround', 'aDrift', 'aDelay', 'aTone'],
        lag: DISSOLVE_TRAIL / DISSOLVE_DURATION,
    });

    cube.add(points);
    cube.userData.dissolve = points;
    return points;
}

// Runs while a project is being opened or is open; droppingFrom is the
// pebble that was clicked
function updateDissolve(elapsedTime) {
    const points = droppingFrom?.userData.dissolve;
    if (!points) return;

    // A pile's surface stays; otherwise the cloud is gone by the end
    const t = (elapsedTime - dropStartedAt) / DISSOLVE_DURATION;
    const ground = points.userData.ground;
    points.visible = ground || t < 1;
    if (!points.visible) return;

    // Giving way to the project's own points as they appear (REVEAL_DURATION)
    // - unless it's becoming the ground they land on
    const detail = droppingFrom.userData.detail;
    const shown = viewState === 'detail' && selectedCube === droppingFrom && detail?.visible;
    const reveal = shown && !ground ? revealAt(elapsedTime - droppingFrom.userData.detailRotateStartTime) : 0;

    // Tails until everything has landed or gone
    points.userData.trails.visible = t < 1;

    const uniforms = points.material.uniforms;
    uniforms.uT.value = Math.min(t, 1);
    uniforms.uOpacity.value = POINT_OPACITY * (1 - reveal);
    uniforms.uFluxTime.value = dropStartedAt * PEBBLE_FLUX_SPEED;
    uniforms.uPixelsPerUnit.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov ?? 45) / 2));
}

createPlayground();

// Everything the catalog loads at start-up has registered by now
sealBoot();

// Cubes
function createPlayground() {
    clearCubes();

    // One cube per slot. The count is fixed, so a project always has a home.
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
        const seed = slot * 2.37 + 1.1;
        // Its size goes into the geometry, not the mesh's scale: the mesh
        // also carries the project's model once it opens, which must not grow
        const size = THREE.MathUtils.randFloat(PEBBLE_SIZE_MIN, PEBBLE_SIZE_MAX);
        const cubeGeometry = makePebbleGeometry(seed, size);
        const cubeMaterial = addPebbleFlux(new THREE.MeshStandardMaterial({
            color: cubesColor,
            metalness: 0.2,
            roughness: 0.6,
            transparent: true,
            opacity: CUBE_FACE_OPACITY,
        }), seed, size);

        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

        // The pebble's rim, in place of a box's edge lines - see makeRimMaterial.
        // It fluxes with the glass, on the same seed, so it stays on it.
        const edges = new THREE.Mesh(cubeGeometry, addPebbleFlux(makeRimMaterial(selectedCubeColor), seed, size));
        edges.renderOrder = 1;
        cube.add(edges);
        cube.userData.edges = edges;
        cube.userData.fluxSeed = seed;
        cube.userData.size = size;

        // Which slot this is, and the project sitting in it (null when empty)
        cube.userData.slot = slot;
        cube.userData.project = projectBySlot.get(slot) ?? null;
        cube.userData.visited = visitedProjects.has(cube.userData.project?.id);

        // How this cube drifts while idle - see wanderOffset(). Position is
        // set every frame from this plus the slot, once layoutCubes() below
        // has given it a slot to drift around.
        cube.userData.wander = createWander();

        // Add the cube to the scene and the array
        scene.add(cube);
        cubes.push(cube);

        addContentToCube(cube);
    }

    layoutCubes();
    fitCameraToGrid();
}

// Function to clear only cubes from the scene
function clearCubes() {
    cubes.forEach((cube) => {
        scene.remove(cube);
    });

    cubes = [];
}

// Helper function to add a project's thumbnail to its cube
function loadThumb(path) {
    if (!thumbScenes.has(path)) {
        const boot = bootAsset();

        thumbScenes.set(path, new Promise((resolve) => {
            gltfLoader.load(
                assetUrl(path),
                (gltf) => { boot.done(); resolve(gltf.scene); },
                boot.progress,
                () => { boot.done(); resolve(null); },
            );
        }));
    }

    return thumbScenes.get(path);
}

// Helper function to add a project's thumbnail to its cube
function addContentToCube(cube) {
    const path = cube.userData.project?.thumbModel ?? EMPTY_SLOT_THUMB;

    loadThumb(path).then((scene) => {
        if (!scene) return;

        const size = cube.userData.project?.thumbSize;
        let content;

        if (size) {
            // Any model, in whatever units it was drawn: centred, its longest
            // side `thumbSize`, in the rock's ink
            const model = scene.clone();
            const box = new THREE.Box3().setFromObject(model);
            const extent = box.getSize(new THREE.Vector3());
            model.position.copy(box.getCenter(new THREE.Vector3())).negate();
            model.traverse((child) => { if (child.isMesh) child.material = THUMB_INK; });

            const fitted = new THREE.Group();
            fitted.scale.setScalar(size / (Math.max(extent.x, extent.y, extent.z) || 1));
            fitted.add(model);

            content = new THREE.Group();
            content.add(fitted);
            cube.userData.contentBaseScale = cube.userData.size;
        } else {
            // The rock, as drawn
            content = scene.clone();
            content.position.set(0, -cube.userData.size, 0);
            cube.userData.contentBaseScale = 0.2 * cube.userData.size;
        }

        content.scale.setScalar(cube.userData.contentBaseScale);
        cube.add(content);
        cube.userData.content = content;

        // A project already open hides every cube's thumbnail; one that
        // arrives late must not pop back in
        if (viewState === 'detail') content.visible = false;
    });
}

/**
 * Pick the arrangement whose proportions sit closest to the viewport's, so a
 * wide window gets a wide grid and a tall one gets a tall grid - without ever
 * changing how many cubes there are.
 */
function computeGridShape(count, aspect) {
    let best = null;

    for (let cols = 1; cols <= count; cols++) {
        const rows = Math.ceil(count / cols);
        const score = Math.abs(Math.log((cols / rows) / aspect));

        if (!best || score < best.score) {
            best = { cols, rows, score };
        }
    }

    return best;
}

// Position the cubes in the current arrangement
function layoutCubes() {
    gridShape = computeGridShape(cubes.length, aspectRatio);

    const step = cubeSize * spacing;
    const offsetZ = ((gridShape.rows - 1) * step) / 2;

    cubes.forEach((cube, index) => {
        const row = Math.floor(index / gridShape.cols);
        const col = index % gridShape.cols;

        // Centre each row, so a partly filled last row still looks deliberate
        const cubesInRow = Math.min(gridShape.cols, cubes.length - row * gridShape.cols);
        const offsetX = ((cubesInRow - 1) * step) / 2;

        cube.position.x = col * step - offsetX;
        cube.position.z = row * step - offsetZ;

        // The hover animation nudges cubes around, so keep a home to return to
        cube.userData.slotPosition = { x: cube.position.x, z: cube.position.z };
    });
}

// Move the camera back far enough to frame the whole grid
function fitCameraToGrid({ animate = false } = {}) {
    const step = cubeSize * spacing;

    // Grid extents, measured to the outer faces of the edge cubes - each
    // as big as its pebble, so a large one on the edge stays on screen
    let halfWidth = ((gridShape.cols - 1) * step + cubeSize) / 2;
    let halfDepth = ((gridShape.rows - 1) * step + cubeSize) / 2;
    cubes.forEach((cube) => {
        const reach = cubeSize / 2 * cube.userData.size;
        halfWidth = Math.max(halfWidth, Math.abs(cube.userData.slotPosition.x) + reach);
        halfDepth = Math.max(halfDepth, Math.abs(cube.userData.slotPosition.z) + reach);
    });
    const gridWidth = halfWidth * 2;
    const gridDepth = halfDepth * 2;
    const margin = 1.15;

    const halfFov = THREE.MathUtils.degToRad(CATALOG_FOV) / 2;
    const distanceForDepth = (gridDepth * margin) / 2 / Math.tan(halfFov);
    const distanceForWidth = (gridWidth * margin) / 2 / (Math.tan(halfFov) * perspectiveCamera.aspect);

    // Clear the highest point a cube reaches while it bobs
    const cubeTop = cubeSize / 2 + 3;
    const height = Math.max(distanceForDepth, distanceForWidth) + cubeTop;

    // How big a pebble looks, for the words on and under it to scale with
    // (see .cube-tag in styles.css) - so a wide screen's bigger pebbles get
    // bigger names, and a phone's stay as they are
    const pixelsPerUnit = screenHeight / (2 * height * Math.tan(halfFov));
    document.documentElement.style.setProperty('--pebble-px', `${(PEBBLE_RADIUS * pixelsPerUnit).toFixed(1)}px`);

    // Position the camera above the grid, looking straight down at its centre
    perspectiveCamera.up.set(0, 1, 0);
    perspectiveCamera.updateProjectionMatrix();

    if (animate) {
        moveCamera(new THREE.Vector3(0, height, 0), new THREE.Vector3(0, 0, 0), 1.1);
        return;
    }

    perspectiveCamera.position.set(0, height, 0);
    perspectiveCamera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

/**
 * Frame a project for the detail view.
 *
 * By default the camera sits square-on to the cube, looking along -Z, so the
 * cube's vertical and horizontal edges stay parallel to the canvas - a
 * one-point view. A project can ask for its own angle instead through
 * `view` (see the projects array).
 *
 * Azimuth 0 means looking along -Z, the catalog's own screen-up, so
 * screen-right is world +X in both views and moving between them is a tilt,
 * with no roll. Azimuth turns the grid by that much on the way in and out,
 * so keep it small - see DECISIONS.md.
 */
// Room around the cube for a project with its own view - calibrated so the
// Rock Print shot lands at the same size as the screenshot it was fitted to
const VIEW_FRAME_MARGIN = 1.16;
const ORTHO_VIEW_DISTANCE = 50; // orthographic ignores distance; this just clears the scene

// Unit vector from the model towards the camera for a project's view, or
// for its heading at a different elevation
function viewDirection(project, { elevation: elevationDeg = project?.view?.elevation ?? 0 } = {}) {
    const elevation = THREE.MathUtils.degToRad(elevationDeg);
    const azimuth = THREE.MathUtils.degToRad(project?.view?.azimuth ?? 0);

    return new THREE.Vector3(
        Math.sin(azimuth) * Math.cos(elevation),
        Math.sin(elevation),
        Math.cos(azimuth) * Math.cos(elevation),
    );
}

// The model was authored to be seen from -X; turning it a quarter shows that
// same face to a camera on +Z
const DETAIL_MODEL_YAW = Math.PI / 2;

// Where a project's model starts its slow rotation: the quarter turn above,
// plus the project's own `view.turn`
function modelStartYaw(project) {
    return DETAIL_MODEL_YAW + THREE.MathUtils.degToRad(project?.view?.turn ?? 0);
}

// Whether the camera's orientation is being driven directly by moveCamera
// rather than left for OrbitControls to re-derive from position each frame
let cameraOrientationLocked = false;
const cameraOrientation = { t: 0 };

/**
 * Sway: a project with `view.sway` has its camera slowly nod up and back
 * down around what it's looking at, by that many degrees either side, while
 * the model turns - a second, slower motion, so the piece is seen from a
 * little above and below its view as well as all the way round.
 *
 * Applied as a change from the last frame's angle rather than as an
 * absolute pose, so it rides on top of wherever the camera is: the
 * project's view, the drawer's close-up, a double-tap zoom, or wherever the
 * visitor has orbited to. It holds while anything else moves the camera (a
 * move in flight, the visitor's hand) and, for a gathering cloud, until the
 * gather is done, so the landing shot is exactly the fitted one. Each time
 * it resumes it starts from zero where the camera now is and grows in over
 * SWAY_EASE_IN - no jump.
 */
const SWAY_PERIOD = 16; // seconds for one nod up, down and back
const SWAY_EASE_IN = 2; // seconds to grow into the full nod after resuming
let swayStartedAt = null; // elapsed time the current run began; null while held
let swayApplied = 0; // radians currently applied on top of the camera's own place
const swayOffset = new THREE.Vector3();
const swayAxis = new THREE.Vector3();

/**
 * Every animated camera move goes through here. Position and target tween as
 * usual; orientation slerps from where it is to exactly where lookAt would
 * leave it at the end, instead of OrbitControls re-deriving it from position
 * every frame. Re-deriving breaks at the catalog's overhead pole, where the
 * heading is undefined and snaps to whatever a near-zero offset implies.
 *
 * A move still in flight is cancelled first. Left running, a longer one
 * (opening, 1.6s) outlasts a shorter one started after it (closing, 1.1s)
 * and drags the camera back towards where it was heading.
 */
function moveCamera(position, target, duration, ease = 'power2.inOut') {
    gsap.killTweensOf([camera.position, controls.target, cameraOrientation]);

    const fromQuat = camera.quaternion.clone();
    const toQuat = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(position, target, camera.up)
    );

    cameraOrientationLocked = true;

    gsap.to(camera.position, { x: position.x, y: position.y, z: position.z, duration, ease });
    gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration, ease });

    // Created last so it completes after position and target have landed,
    // and controls.update() resyncs from the final values
    cameraOrientation.t = 0;
    gsap.to(cameraOrientation, {
        t: 1,
        duration,
        ease,
        onUpdate: () => camera.quaternion.slerpQuaternions(fromQuat, toQuat, cameraOrientation.t),
        onComplete: () => {
            cameraOrientationLocked = false;
            controls.update();
        },
    });
}

function updateSway(project, since, elapsedTime) {
    const amplitude = THREE.MathUtils.degToRad(project?.view?.sway ?? 0);
    const gathering = project?.gather && since < GATHER_DURATION;

    if (!amplitude || gathering || cameraOrientationLocked || visitorOrbiting || viewState !== 'detail') {
        swayStartedAt = null;
        return;
    }

    if (swayStartedAt === null) {
        swayStartedAt = elapsedTime;
        swayApplied = 0;
    }

    const t = elapsedTime - swayStartedAt;
    const ramp = Math.min(t / SWAY_EASE_IN, 1);
    const angle = amplitude * ramp * ramp * (3 - 2 * ramp) * Math.sin((t / SWAY_PERIOD) * Math.PI * 2);

    // Turn the camera about its own screen-right axis through the target
    // (negative raises it); controls.update() then re-aims it at the target
    swayAxis.set(1, 0, 0).applyQuaternion(camera.quaternion);
    swayOffset.copy(camera.position).sub(controls.target).applyAxisAngle(swayAxis, -(angle - swayApplied));
    camera.position.copy(controls.target).add(swayOffset);
    swayApplied = angle;
}

function frameDetail(object, { duration = 1.6, ease, fit, fitZoom } = {}) {
    detailZoomed = false;

    // A project with its own view is framed on the cube alone. Seen from
    // above at an angle, the bounding box of the model's scattered points
    // balloons and changes size as the model turns; the cube is the frame
    // the shot is composed around, and stray points running off the edges
    // read fine.
    const framesCube = Boolean(object.userData.project?.view);

    // A project's view can come in closer than the cube's fit (`zoom`), so
    // the cube runs off the edges and the model fills the screen, and be
    // nudged up the screen (`lift`, a share of the screen's height). Either
    // can be one number, or { side, stacked } per layout. Not with the
    // drawer open on a narrow screen, which has its own close-up; beside a
    // drawer on a wide one it keeps its view, framed into the space left.
    const { mode, fraction } = getPanelLayout();
    const side = mode === 'side';
    // Or framed on a box of its own (`fit`, world space) - a pile's
    // aggregates with the drawer open - at the plain fit, no zoom or lift
    const ownView = framesCube && !fit && (!drawerOpen || side) ? object.userData.project.view : {};
    const box = fit?.clone() ?? (framesCube
        ? new THREE.Box3().setFromCenterAndSize(object.position, new THREE.Vector3().setScalar(cubeSize))
        : new THREE.Box3().setFromObject(object));
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);

    const toCamera = viewDirection(object.userData.project);
    const forward = toCamera.clone().negate();
    const right = forward.clone().cross(camera.up).normalize();
    const up = right.clone().cross(forward).normalize();

    // The box's extent as it projects onto the screen axes, plus its depth
    // along the view axis - under perspective the near face projects larger
    // than the centre, so the fit has to allow for it
    const halfW = Math.abs(right.x) * half.x + Math.abs(right.y) * half.y + Math.abs(right.z) * half.z;
    const halfH = Math.abs(up.x) * half.x + Math.abs(up.y) * half.y + Math.abs(up.z) * half.z;
    const halfD = Math.abs(forward.x) * half.x + Math.abs(forward.y) * half.y + Math.abs(forward.z) * half.z;

    const perLayout = (value, fallback) => (typeof value === 'object' ? value[mode] : value) ?? fallback;
    const zoom = perLayout(fit ? fitZoom : ownView.zoom, 1);
    const lift = perLayout(ownView.lift, 0);
    let margin = side
        ? DETAIL_MARGIN.side
        : (drawerOpen ? DETAIL_MARGIN.stackedOpen : DETAIL_MARGIN.stackedParked);

    // DETAIL_MARGIN was tuned against the whole model's box, scatter and
    // all; the cube alone wants its own
    if (framesCube) margin = VIEW_FRAME_MARGIN;

    /**
     * What is left of the viewport once the bar and the drawer have taken
     * their share: the drawer eats width side-by-side and height stacked,
     * and the bar eats height off the top.
     */
    const barShare = side ? 0 : barFraction();
    const freeW = side ? 1 - fraction : 1;
    const freeH = Math.max(1 - barShare - (side ? 0 : fraction), 0.15);

    const ortho = DETAIL_PROJECTION === 'orthographic';
    const tan = Math.tan(THREE.MathUtils.degToRad(DETAIL_FOV[mode]) / 2);

    let distance;
    let halfHeight;

    if (ortho) {
        // Nothing converges, so the fit is just the projected extent
        const neededH = (halfH * margin) / freeH;
        const neededW = (halfW * margin) / (aspectRatio * freeW);

        halfHeight = Math.max(neededH, neededW);
        distance = ORTHO_VIEW_DISTANCE;
    } else {
        // Keep the nearest face inside the free area, not just the centre
        const forWidth = (halfD + halfW / (tan * aspectRatio)) / freeW;
        const forHeight = (halfD + halfH / tan) / freeH;

        distance = margin * Math.max(forWidth, forHeight) / zoom;
        halfHeight = distance * tan;
    }

    /**
     * Where the model should sit, in normalised screen coordinates: pushed
     * away from whichever edges are spoken for. Moving the camera the
     * opposite way puts it there.
     */
    const ndcX = side ? -fraction : 0;
    let ndcY = (side ? 0 : fraction) - barShare;

    // A cube-framed view sits centred on the screen when its top already
    // clears the bar there, and only drops as far as it has to otherwise -
    // centring it in the space below the bar leaves it low on a tall phone
    if (framesCube && !ortho && !side && !drawerOpen && zoom === 1) {
        // Highest point of the cube on screen, from its actual corners
        const eye = center.clone().addScaledVector(toCamera, distance);
        let top = -Infinity;
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
            const v = new THREE.Vector3(sx * half.x, sy * half.y, sz * half.z).add(center).sub(eye);
            top = Math.max(top, v.dot(up) / (v.dot(forward) * tan));
        }
        ndcY = -Math.min(barShare, Math.max(0, top - (1 - 2 * barShare)));
    }

    ndcY += 2 * lift;

    const offset = right.clone().multiplyScalar(-ndcX * halfHeight * aspectRatio)
        .add(up.clone().multiplyScalar(-ndcY * halfHeight));

    const position = center.clone().addScaledVector(toCamera, distance).add(offset);
    const target = center.clone().add(offset);

    if (!ortho) animateFov(DETAIL_FOV[mode], duration);

    moveCamera(position, target, duration, ease);

    if (ortho) {
        const frustum = { halfHeight: orthoHalfHeight };
        gsap.to(frustum, {
            halfHeight,
            duration,
            ease: 'power2.inOut',
            onUpdate: () => setOrthoFrustum(frustum.halfHeight),
        });
    }
}

/**
 * A close, elevated crop of the model, used while the drawer is open - the
 * description is the thing being read then, not the piece as a whole, so
 * the shot trades the full-fit square-on view for a tighter, more
 * atmospheric one. Deliberately not one-point and not fit to the whole
 * box - see DECISIONS.md for why that's fine here specifically.
 */
/**
 * The frame while the drawer is open. On a wide screen the drawer sits
 * beside the model, so the whole piece is framed into the space to its left
 * (frameDetail already fits into whatever the drawer leaves free). On a
 * narrow one it covers the lower half, and the close-up is what fits.
 */
// The fit of a pile's box allows for any turn and for its depth, which on a
// phone's short strip above the drawer leaves it small - so closer there:
// 1.6 only kept it about the size it was before, which didn't read as a
// zoom; at 2.2 it fills the strip, its outer rods running off the edges
const PILE_DRAWER_ZOOM = { side: 1, stacked: 2.2 };

function frameWithDrawerOpen(cube, options) {
    // A pile: in on the aggregates themselves, beside the drawer or above
    // it, rather than the whole surface they landed on
    const pile = cube.userData.detail?.userData.pile;
    if (pile) {
        frameDetail(cube, { ...options, fit: pile.bounds(), fitZoom: PILE_DRAWER_ZOOM });
        return;
    }

    if (getPanelLayout().mode === 'side') {
        frameDetail(cube, options);
    } else {
        frameDetailCloseup(cube, options);
    }
}

const CLOSEUP_ELEVATION = 38; // degrees
const CLOSEUP_DISTANCE_FACTOR = 1.1;

function frameDetailCloseup(cube, { duration = 1.1 } = {}) {
    detailZoomed = false;

    const model = cube.userData.detail;
    if (!model) return;

    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;

    // The project's own heading, from CLOSEUP_ELEVATION above. Any steeper
    // and on a phone the strip left above the drawer holds only fragments
    const dir = viewDirection(cube.userData.project, { elevation: CLOSEUP_ELEVATION });
    const position = center.clone().addScaledVector(dir, radius * CLOSEUP_DISTANCE_FACTOR);

    moveCamera(position, center, duration);
}

// Changing the field of view changes how strongly depth converges, so the
// catalog and a project can each have their own lens
function animateFov(fov, duration) {
    // Same reason as moveCamera: an older, longer lens change would otherwise
    // outlast this one and leave the wrong lens behind
    gsap.killTweensOf(perspectiveCamera, 'fov');

    gsap.to(perspectiveCamera, {
        fov,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
            perspectiveCamera.updateProjectionMatrix();
            setPerspectivePointScale();
        },
    });
}

function enterDetailProjection() {
    // Under perspective there is nothing to switch; frameDetail sets the lens
    if (DETAIL_PROJECTION === 'orthographic') swapToOrthographic();
}

function exitDetailProjection(duration) {
    if (DETAIL_PROJECTION === 'orthographic') {
        swapToPerspective();
    }

    animateFov(CATALOG_FOV, duration);
}

/**
 * Switching projection is a cut, so start the incoming camera matched to what
 * the outgoing one was showing and the scale does not jump.
 */
function swapToOrthographic() {
    const distance = perspectiveCamera.position.distanceTo(controls.target);
    const halfHeight = distance * Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov) / 2);

    orthographicCamera.position.copy(perspectiveCamera.position);
    orthographicCamera.quaternion.copy(perspectiveCamera.quaternion);
    setOrthoFrustum(halfHeight);
    setActiveCamera(orthographicCamera);
}

function swapToPerspective() {
    perspectiveCamera.fov = CATALOG_FOV;
    perspectiveCamera.updateProjectionMatrix();

    const direction = orthographicCamera.position.clone().sub(controls.target);
    const distance = orthoHalfHeight / Math.tan(THREE.MathUtils.degToRad(CATALOG_FOV) / 2);

    if (direction.lengthSq() > 0) {
        perspectiveCamera.position.copy(controls.target).addScaledVector(direction.normalize(), distance);
    }

    perspectiveCamera.quaternion.copy(orthographicCamera.quaternion);
    setActiveCamera(perspectiveCamera);
}

window.addEventListener('resize', () => {
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;
    aspectRatio = screenWidth / screenHeight;

    // Update both cameras; only one of them is active at a time
    perspectiveCamera.aspect = aspectRatio;
    perspectiveCamera.updateProjectionMatrix();
    setOrthoFrustum(orthoHalfHeight);
    refreshPointScale();

    // Update renderer
    renderer.setSize(screenWidth, screenHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Re-arrange the cubes that already exist. They are never rebuilt, so a
    // project keeps its slot and anything already loaded stays loaded.
    if (viewState === 'catalog') {
        layoutCubes();
        fitCameraToGrid();
        return;
    }

    // The panel changes size and may switch sides, so re-frame
    if (!selectedCube) return;

    if (drawerOpen) {
        frameWithDrawerOpen(selectedCube, { duration: 0.4 });
    } else {
        frameDetail(selectedCube, { duration: 0.4 });
    }
});

// The flow's settings and state - see trackFlowPointer. Up here because
// animate() runs its first frame as soon as it is defined.
const FLOW_RADIUS = cubeSize * 1.4; // units - how far from the pointer cubes feel it
const FLOW_CARRY = 0.07; // seconds of pointer travel a cube right under it is carried
const FLOW_MAX = 2.2; // units - the furthest a cube is carried
const FLOW_STIFFNESS = 28; // 1/s² - pull back towards home
const FLOW_DAMPING = 5.5; // 1/s - under-damped, so a cube overshoots a touch and settles
const FLOW_TILT = 0.06; // radians of lean per unit/second of the cube's own speed
const FLOW_TILT_MAX = 0.35; // radians
const FLOW_POINTER_FADE = 0.12; // seconds for the pointer's speed to die away once it stops
const FLOW_STEP = 1 / 120; // seconds per integration step
// Pebbles that touch push each other apart, on the same springs - see bumpPebbles
const BUMP_STIFFNESS = 40; // 1/s² per unit of overlap - soft, so they give a little and still overlap a little
const BUMP_REACH = 0.95; // a pebble's reach, as a share of its radius - its glass just about touching

const flowPointer = new THREE.Vector3();
const flowPointerVelocity = new THREE.Vector2();
const flowPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const flowHit = new THREE.Vector3();
let flowPointerKnown = false;
let flowPointerAt = 0;

const clock = new THREE.Clock();
let lastFrameTime = 0;

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Update smoke
    smokeMaterial.uniforms.uTime.value = elapsedTime;
    pebbleFluxTime.value = elapsedTime * PEBBLE_FLUX_SPEED;
    renderer.getDrawingBufferSize(trailResolution.value);

    // The catalog's own motion - wander, hover, spotlight - only runs while
    // it is actually what's on screen. A click hands every cube to the
    // drop until the project opens; they then hold wherever it left
    // them, hidden by openProject's fade, until 'returning' places them
    // back home. The spotlight cycle's dwell/gap timers self-correct
    // against the clock once the catalog resumes, however long detail view
    // was open for, so they need no pausing or resetting on the way in or out.
    const frameTime = Math.min(elapsedTime - lastFrameTime, 0.05);
    lastFrameTime = elapsedTime;

    if (viewState === 'catalog') {
        updateSpotlightCycle(elapsedTime);
        // Each pebble's own place first; the flow and the bumps read it
        cubes.forEach((cube) => updateCube(cube, elapsedTime));
        updateFlow(frameTime);
        cubes.forEach(applyFlow);
    } else if (viewState === 'dropping') {
        cubes.forEach((cube) => updateDroppingCube(cube, elapsedTime));
        updateDissolve(elapsedTime);
    } else if (viewState === 'returning') {
        // Back home before they fade in, wherever the drop left them - and
        // already pushed apart, so they don't spring apart as they appear
        cubes.forEach((cube) => placeAtRest(cube, elapsedTime));
        updateFlow(frameTime);
        cubes.forEach(applyFlow);
    } else {
        // The camera starts moving in before the drop has finished - the
        // rest of the fall plays out under openProject's fade
        if (dropInProgress(elapsedTime)) {
            cubes.forEach((cube) => { if (cube !== selectedCube) placeDroppingCube(cube, elapsedTime); });
        }
        updateDissolve(elapsedTime);

        if (selectedCube && selectedCube.userData.detail) {
            // Turns the model itself, not the camera, so the cube's edges stay
            // square to the canvas - see DETAIL_ROTATE_SPEED
            const since = elapsedTime - selectedCube.userData.detailRotateStartTime;
            // A pile falls first and only starts turning once it has settled
            const pile = selectedCube.userData.detail.userData.pile;
            pile?.step(frameTime, since);
            const turning = pile ? Math.max(since - pile.settledAt, 0) : since;
            selectedCube.userData.detail.rotation.y = modelStartYaw(selectedCube.userData.project) + turning * DETAIL_ROTATE_SPEED;

            // A pile's ground (the pebble's dissolve, landed) turns with it
            const dissolve = selectedCube.userData.dissolve;
            if (pile && dissolve?.userData.ground) dissolve.rotation.y = turning * DETAIL_ROTATE_SPEED;

            // Replays from scattered each time the project opens, since
            // detailRotateStartTime is reset whenever the model is shown
            setGather(selectedCube.userData.detail, Math.min(since / GATHER_DURATION, 1));
            setReveal(selectedCube.userData.detail, revealAt(since));

            maybeShowTapHint(selectedCube.userData.detail, since);
            updateSway(selectedCube.userData.project, since, elapsedTime);
        }
    }

    updateCubeTags(elapsedTime);

    // Update controls - except while a camera move is driving orientation
    // itself (see moveCamera's cameraOrientationLocked), since controls.update()
    // would re-derive orientation from the camera's raw position each frame
    // and fight it
    if (!cameraOrientationLocked) controls.update();

    // Render the scene
    renderer.render(scene, camera);
}
animate();

// A ray can land on a cube's edges or on the model inside it, so walk back
// up the hierarchy to the cube that owns whatever was hit.
function findCube(object) {
    let current = object;

    while (current) {
        if (current.userData.slot !== undefined) return current;
        current = current.parent;
    }

    return null;
}

/**
 * One cube's full visual state - position, rotation, scale, colour,
 * opacity - is a pure function of its current mode and the clock,
 * recomputed from scratch every frame. There is no separate animation loop
 * to start or stop and nothing is ever incremented, so nothing can drift
 * and nothing needs to be reset by hand when a mode ends: the next frame
 * simply computes a different mode's state instead.
 */
function updateCube(cube, elapsedTime) {
    if (cube === spotlightCube) {
        updateSpotlightCube(cube, elapsedTime);
    } else {
        updateIdleCube(cube, elapsedTime);
    }
}

/**
 * A pebble's colours for how orange the spotlight has made it, 0..1. At 0
 * it's its resting self. The face glows through its
 * emissive colour rather than its base colour: the base colour is lit by
 * the scene's cyan lights, which turn an orange green - and it's dimmed as
 * the glow rises, or that cyan-lit grey washes the orange out to tan.
 */
function paintGlow(cube, amount, rimOpacity = 1) {
    const restOpacity = restingFaceOpacity(cube);
    cube.material.opacity = restOpacity + (SPOTLIGHT_FACE_OPACITY - restOpacity) * amount;
    cube.material.color.copy(restingFaceColor(cube)).multiplyScalar(1 - amount * SPOTLIGHT_FACE_DIM);
    spotlightFaceColor.copy(spotlightGlowColor).multiplyScalar(amount * SPOTLIGHT_FACE_GLOW);
    cube.material.emissive.copy(spotlightFaceColor);

    spotlightEdgeColor.copy(restingRimColor(cube)).lerp(spotlightGlowColor, amount);
    cube.userData.edges.material.color.copy(spotlightEdgeColor);
    cube.userData.edges.material.opacity = rimOpacity;
}

// Where a cube sits while idle - shared with the grid's return after a project
// closes, which places cubes without touching their fading opacity
function placeAtRest(cube, elapsedTime) {
    const base = cube.userData.slotPosition;
    const offset = wanderOffset(cube.userData.wander, elapsedTime);
    cube.position.set(base.x + offset.x, offset.y, base.z + offset.z);

    cube.rotation.set(offset.tiltX, 0, offset.tiltZ);
    cube.scale.setScalar(1);
}

/**
 * The flow: the cursor (or a finger) moving through the grid carries the
 * cubes near it along, like a hand drawn through water. They lean the way
 * they're carried and drift back on a soft, slightly bouncy spring once it
 * passes.
 *
 * Unlike the rest of the catalog's motion this has memory - a spring
 * integrated frame by frame - since a push has to linger after the pointer
 * moves on. It's added on top of whatever mode a cube is in, only in the
 * catalog, and zeroed whenever the catalog is left, so it never carries a
 * stale shove into the drop or back out of a project.
 *
 * Only motion pushes: a resting cursor exerts nothing, so the cube under it
 * stays put to be clicked.
 *
 * Pebbles also push each other: where two touch, each is shoved away from
 * the other on the same spring (bumpPebbles), so one carried by the pointer,
 * drifting, or swelling in the spotlight's jump nudges its neighbours along.
 */

function trackFlowPointer(event) {
    if (viewState !== 'catalog') return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (!raycaster.ray.intersectPlane(flowPlane, flowHit)) return;

    const now = performance.now() / 1000;

    if (flowPointerKnown) {
        const dt = Math.max(now - flowPointerAt, 1 / 240);
        const vx = (flowHit.x - flowPointer.x) / dt;
        const vz = (flowHit.z - flowPointer.z) / dt;

        // Smoothed, since pointer events arrive unevenly
        flowPointerVelocity.x += (vx - flowPointerVelocity.x) * 0.5;
        flowPointerVelocity.y += (vz - flowPointerVelocity.y) * 0.5;
    }

    flowPointer.copy(flowHit);
    flowPointerAt = now;
    flowPointerKnown = true;
}

function resetFlow() {
    flowPointerVelocity.set(0, 0);
    flowPointerKnown = false;
    cubes.forEach((cube) => {
        cube.userData.flow = { x: 0, z: 0, vx: 0, vz: 0 };
    });
}

function updateFlow(dt) {
    // The pointer's push dies away once it stops moving
    flowPointerVelocity.multiplyScalar(Math.exp(-dt / FLOW_POINTER_FADE));

    cubes.forEach((cube) => {
        cube.userData.flow ??= { x: 0, z: 0, vx: 0, vz: 0 };
        cube.userData.flow.target = flowTarget(cube);
    });

    // Damped springs towards those, and the bumps, integrated in small steps
    const steps = Math.ceil(dt / FLOW_STEP);
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
        cubes.forEach((cube) => {
            const flow = cube.userData.flow;
            flow.ax = FLOW_STIFFNESS * (flow.target.x - flow.x) - FLOW_DAMPING * flow.vx;
            flow.az = FLOW_STIFFNESS * (flow.target.z - flow.z) - FLOW_DAMPING * flow.vz;
        });
        bumpPebbles();
        cubes.forEach((cube) => {
            const flow = cube.userData.flow;
            flow.vx += flow.ax * h;
            flow.vz += flow.az * h;
            flow.x += flow.vx * h;
            flow.z += flow.vz * h;
        });
    }
}

// Where the pointer's motion would carry this cube right now
function flowTarget(cube) {
    const home = cube.userData.slotPosition;
    const target = { x: 0, z: 0 };
    if (!flowPointerKnown || !home) return target;

    const distance = Math.hypot(home.x - flowPointer.x, home.z - flowPointer.z);
    const reach = Math.exp(-((distance / FLOW_RADIUS) ** 2));
    target.x = flowPointerVelocity.x * FLOW_CARRY * reach;
    target.z = flowPointerVelocity.y * FLOW_CARRY * reach;

    const length = Math.hypot(target.x, target.z);
    if (length > FLOW_MAX) {
        target.x *= FLOW_MAX / length;
        target.z *= FLOW_MAX / length;
    }
    return target;
}

// Two pebbles that touch, seen from above (as the camera sees them), push
// apart in proportion to how far they overlap - the bigger one, heavier,
// giving way less. Soft: against the pull home they part only partly, so
// big neighbours still overlap a little. Read from where each pebble is
// this frame (cube.position, before the flow is added) plus its flow
function bumpPebbles() {
    for (let i = 0; i < cubes.length; i++) {
        const a = cubes[i];
        for (let j = i + 1; j < cubes.length; j++) {
            const b = cubes[j];
            const dx = a.position.x + a.userData.flow.x - b.position.x - b.userData.flow.x;
            const dz = a.position.z + a.userData.flow.z - b.position.z - b.userData.flow.z;
            const distance = Math.hypot(dx, dz);
            const reach = bumpRadius(a) + bumpRadius(b);
            if (distance >= reach || distance === 0) continue;

            const push = BUMP_STIFFNESS * (reach - distance) / distance;
            const massA = a.userData.size ** 2;
            const massB = b.userData.size ** 2;
            a.userData.flow.ax += push * dx / massA;
            a.userData.flow.az += push * dz / massA;
            b.userData.flow.ax -= push * dx / massB;
            b.userData.flow.az -= push * dz / massB;
        }
    }
}

// Its scale too, so the spotlight's pulse shoves its neighbours
function bumpRadius(cube) {
    return PEBBLE_RADIUS * cube.userData.size * cube.scale.x * BUMP_REACH;
}

// On top of whatever the cube's mode has just set
function applyFlow(cube) {
    const flow = cube.userData.flow;
    if (!flow) return;

    cube.position.x += flow.x;
    cube.position.z += flow.z;

    // Leaning into the direction it's being carried. Down the screen is +Z,
    // and a positive turn about X tips the top of the cube that way.
    const lean = (value) => THREE.MathUtils.clamp(value * FLOW_TILT, -FLOW_TILT_MAX, FLOW_TILT_MAX);
    cube.rotation.x += lean(flow.vz);
    cube.rotation.z -= lean(flow.vx);
}

// Floating, as it rests. Hover changes nothing: the pebble under the
// pointer stays as it is, to be clicked
function updateIdleCube(cube, elapsedTime) {
    placeAtRest(cube, elapsedTime);
    paintGlow(cube, 0);

    if (cube.userData.content) {
        cube.userData.content.scale.setScalar(cube.userData.contentBaseScale);
    }
}

// Ramp the whole effect in, and back out, rather than popping into a fast
// rock on the first frame and snapping to rest the instant the dwell ends -
// this is what makes it settle rather than just stop. Eased at both ends
// (smoothstep), so it neither starts nor lands with a jolt.
function spotlightIntensity(elapsedTime) {
    const since = elapsedTime - spotlightStartedAt;
    const fadeIn = Math.min(since / SPOTLIGHT_FADE_IN, 1);
    const fadeOut = Math.min((SPOTLIGHT_DWELL - since) / SPOTLIGHT_FADE_OUT, 1);
    const ramp = Math.max(0, Math.min(fadeIn, fadeOut));

    return ramp * ramp * (3 - 2 * ramp);
}

function updateSpotlightCube(cube, elapsedTime) {
    const since = elapsedTime - spotlightStartedAt;
    const intensity = spotlightIntensity(elapsedTime);

    const pulse = Math.sin((since / SPOTLIGHT_PULSE_PERIOD) * Math.PI * 2); // -1..1
    const glow = (pulse + 1) / 2; // 0..1
    const lift = Math.max(0, pulse); // only the upward half of each beat

    // Holds where its float had it when the spotlight began, rather than
    // also wandering, lifted on the upward half of each beat - a jump, not a
    // drift - amid the others around it. Blended with the live float by the
    // same intensity, so it leaves its drift and rejoins it without a snap:
    // the float has moved on during the dwell, and the fade-out glides it
    // there.
    const base = cube.userData.slotPosition;
    const held = wanderOffset(cube.userData.wander, spotlightStartedAt);
    const live = wanderOffset(cube.userData.wander, elapsedTime);
    const mix = (from, to) => from + (to - from) * intensity;
    cube.position.set(
        base.x + mix(live.x, held.x),
        mix(live.y, held.y) + lift * SPOTLIGHT_JUMP_HEIGHT * intensity,
        base.z + mix(live.z, held.z),
    );

    const rock = (period, phase) => Math.sin((since / period) * Math.PI * 2 + phase) * SPOTLIGHT_ROTATE_AMPLITUDE;
    cube.rotation.set(
        mix(live.tiltX, rock(spotlightRotatePeriodX, 0)),
        0,
        mix(live.tiltZ, rock(spotlightRotatePeriodZ, 1.7)),
    );
    cube.scale.setScalar(1 + pulse * SPOTLIGHT_CUBE_SCALE_AMPLITUDE * intensity);

    // Blink the whole pebble - glass and rim alike - between its resting
    // colours and the orange, the rim never fully off so it reads as
    // glowing rather than flickering
    paintGlow(cube, glow * intensity, 1 - intensity * 0.35 * (1 - glow));

    if (cube.userData.content) {
        const contentScale = cube.userData.contentBaseScale * (1 + pulse * SPOTLIGHT_SCALE_AMPLITUDE * intensity);
        cube.userData.content.scale.setScalar(contentScale);
    }
}

/**
 * Pins a tag over the lower part of a cube's top face, on screen. On the
 * face rather than above it, since a top-row cube has no room above it on a
 * tight frame.
 */
function placeTagOnCube(tag, cube) {
    // Down the screen is world +Z from the overhead catalog camera
    cube.updateMatrixWorld();
    cubeTagAnchor.set(0, PEBBLE_RADIUS * PEBBLE_SQUASH, cubeSize * 0.36).multiplyScalar(cube.userData.size);
    cube.localToWorld(cubeTagAnchor).project(camera);

    const x = (cubeTagAnchor.x + 1) / 2 * screenWidth;
    const y = (1 - cubeTagAnchor.y) / 2 * screenHeight;
    tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
}

// Where a point on a cube lands on screen, in pixels
function screenPoint(vector) {
    vector.project(camera);
    return [(vector.x + 1) / 2 * screenWidth, (1 - vector.y) / 2 * screenHeight];
}

// The wind on the string at a moment: gusts that swell and die away (a slow
// envelope, never quite still), each carrying a quicker flutter, mostly
// blowing one way with the odd turn back. Roughly -1..1.
function wind(t) {
    const gust = 0.35 + 0.65 * Math.max(0, Math.sin(t * TAG_GUST * Math.PI * 2) * 0.6 + Math.sin(t * TAG_GUST * 4.1 + 1.7) * 0.4);
    const sway = 0.65 * Math.sin(t * 1.1 + 0.4) + 0.35;
    const flutter = 0.45 * Math.sin(t * 5.3) + 0.25 * Math.sin(t * 8.7 + 2.1);
    return gust * (sway + flutter);
}

function hangSpotlightTag(cube, elapsedTime) {
    // Tied to the pebble's lower edge as seen from above - down the screen
    // is world +Z - just inside its rim
    cube.updateMatrixWorld();
    const [ax, ay] = screenPoint(cube.localToWorld(tagPivot.set(0, 0, PEBBLE_RADIUS * cube.userData.size * 0.9)));
    const [cx, cy] = screenPoint(cube.localToWorld(tagCentre.set(0, 0, 0)));
    const pebbleRadius = Math.hypot(ax - cx, ay - cy) / 0.9;
    const length = Math.max(TAG_STRING_MIN, pebbleRadius * TAG_STRING_LENGTH);
    const link = length / ROPE_SEGMENTS;

    // A new pebble: the string hangs straight down, at rest
    if (rope.cube !== cube) {
        rope.cube = cube;
        rope.points = Array.from({ length: ROPE_SEGMENTS + 1 }, (_, i) => {
            const y = ay + link * i;
            return { x: ax, y, prevX: ax, prevY: y };
        });
        rope.pivotX = ax;
        rope.pivotY = ay;
        rope.lastTime = elapsedTime;
    }

    // The knot moves smoothly across the steps rather than all at once, so a
    // slow frame doesn't yank the string
    const span = Math.min(elapsedTime - rope.lastTime, 0.1);
    const fromX = rope.pivotX;
    const fromY = rope.pivotY;
    rope.pivotX = ax;
    rope.pivotY = ay;
    rope.lastTime = elapsedTime;

    const points = rope.points;
    const last = points.length - 1;
    let remaining = span;

    while (remaining > 0) {
        const dt = Math.min(TAG_STEP, remaining);
        remaining -= dt;

        const t = elapsedTime - remaining;
        const along = span > 0 ? 1 - remaining / span : 1;
        const knotX = fromX + (ax - fromX) * along;
        const knotY = fromY + (ay - fromY) * along;
        const keep = 1 - TAG_DAMPING * dt;

        // Every point but the knot moves on its own momentum, falls, and is
        // pushed by a breeze that's a little out of step from one to the next
        for (let i = 1; i <= last; i++) {
            const p = points[i];
            const breeze = TAG_STILL ? 0 : TAG_BREEZE * wind(t - (i / last) * TAG_WAVE_LAG);
            const nextX = p.x + (p.x - p.prevX) * keep + breeze * dt * dt;
            const nextY = p.y + (p.y - p.prevY) * keep + TAG_GRAVITY * dt * dt;
            p.prevX = p.x;
            p.prevY = p.y;
            p.x = nextX;
            p.y = nextY;
        }

        // Hold each link at its length, the knot pinned and the tag heavier,
        // so the string gives way to the tag rather than the other way round
        points[0].x = knotX;
        points[0].y = knotY;
        for (let pass = 0; pass < ROPE_ITERATIONS; pass++) {
            for (let i = 0; i < last; i++) {
                const a = points[i];
                const b = points[i + 1];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const d = Math.hypot(dx, dy) || 1;
                const pull = (d - link) / d;
                const wa = i === 0 ? 0 : 1;
                const wb = i + 1 === last ? 1 / TAG_WEIGHT : 1;
                const share = wa + wb;
                a.x += dx * pull * (wa / share);
                a.y += dy * pull * (wa / share);
                b.x -= dx * pull * (wb / share);
                b.y -= dy * pull * (wb / share);
            }
        }

        // A little stiffness: each point is nudged towards the line through
        // its neighbours, so a sharp kink eases out but a curve survives
        for (let i = 1; i < last; i++) {
            const a = points[i - 1];
            const b = points[i];
            const c = points[i + 1];
            b.x += ((a.x + c.x) / 2 - b.x) * ROPE_STIFFNESS;
            b.y += ((a.y + c.y) / 2 - b.y) * ROPE_STIFFNESS;
        }

        // The tag never swings further than TAG_MAX_SWING from under the knot
        const tag = points[last];
        const reach = Math.hypot(tag.x - knotX, tag.y - knotY);
        const swing = Math.atan2(tag.x - knotX, tag.y - knotY);
        if (Math.abs(swing) > TAG_MAX_SWING) {
            const capped = Math.sign(swing) * TAG_MAX_SWING;
            tag.x = knotX + Math.sin(capped) * reach;
            tag.y = knotY + Math.cos(capped) * reach;
        }
    }

    // The tag hangs from the string's end, turned with the string's overall
    // lean and a little of its last stretch - never past TAG_MAX_SWING
    const tag = points[last];
    const before = points[Math.floor(last / 2)];
    const lean = Math.atan2(tag.x - ax, tag.y - ay);
    const end = Math.atan2(tag.x - before.x, tag.y - before.y);
    const angle = THREE.MathUtils.clamp(lean * 0.6 + end * 0.4, -TAG_MAX_SWING, TAG_MAX_SWING);
    spotlightTag.style.transform = `translate(${tag.x}px, ${tag.y}px) translate(-50%, 0) rotate(${-angle}rad)`;

    // One smooth curve through every point (Catmull-Rom, as cubic Beziers)
    let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < last; i++) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, last)];
        d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)}`
            + ` ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)}`
            + ` ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    for (const path of spotlightStringPaths) path.setAttribute('d', d);

    // A dot where it's tied on, as if hanging from the pebble, with a glow
    // like the string's
    const knot = THREE.MathUtils.clamp(pebbleRadius * TAG_KNOT_SIZE, 2, 6);
    spotlightKnots.forEach((circle, index) => {
        circle.setAttribute('cx', ax.toFixed(1));
        circle.setAttribute('cy', ay.toFixed(1));
        circle.setAttribute('r', (index === 0 ? knot * 2.2 : knot).toFixed(1));
    });
}

/**
 * The catalog's words on its cubes: "Still empty..." for a moment on an
 * empty slot that was just clicked, and "Project 01"... on the cube glowing
 * orange, blinking with its glow and gone once it's back in its float.
 */
function updateCubeTags(elapsedTime) {
    const inCatalog = viewState === 'catalog';

    // The same beat and ramp the cube itself glows by (updateSpotlightCube),
    // so the name is brightest when the cube is most orange and has faded
    // out entirely by the time the cube has settled. "Still empty..." wins
    // on its own pebble.
    const spotlightShows = inCatalog && spotlightCube && spotlightCube !== emptyTagCube;
    if (spotlightShows) {
        const since = elapsedTime - spotlightStartedAt;
        const glow = (Math.sin((since / SPOTLIGHT_PULSE_PERIOD) * Math.PI * 2) + 1) / 2;
        // A project's own name; an empty slot its number
        const label = spotlightCube.userData.project?.title
            ?? `Project ${String(spotlightCube.userData.slot + 1).padStart(2, '0')}`;
        if (spotlightTag.textContent !== label) spotlightTag.textContent = label;

        const intensity = spotlightIntensity(elapsedTime);
        hangSpotlightTag(spotlightCube, elapsedTime);
        spotlightTag.style.opacity = intensity * (SPOTLIGHT_TAG_MIN + (1 - SPOTLIGHT_TAG_MIN) * glow);

        // The string doesn't blink with the name, it just comes and goes
        spotlightString.style.opacity = intensity;
    } else {
        spotlightTag.style.opacity = 0;
        spotlightString.style.opacity = 0;
        rope.cube = null;
    }

    const emptySince = elapsedTime - emptyTagShownAt;
    const emptyOpacity = inCatalog && emptyTagCube
        ? Math.max(0, Math.min(1, (EMPTY_TAG_DURATION - emptySince) / EMPTY_TAG_FADE))
        : 0;

    if (emptyOpacity > 0) {
        placeTagOnCube(emptyTag, emptyTagCube);
    } else {
        emptyTagCube = null;
    }
    emptyTag.style.opacity = emptyOpacity;
}

// Any cube is fair game, project or empty - this is the grid feeling
// alive, not only an invitation to click a project. Never the one already
// under the cursor, and not the one that just finished, so it visibly
// moves on rather than occasionally repeating itself.
function pickSpotlightCube() {
    const withoutRepeat = cubes.filter((cube) => cube !== hoveredCube && cube !== lastSpotlightCube);
    const candidates = withoutRepeat.length ? withoutRepeat : cubes.filter((cube) => cube !== hoveredCube);

    if (!candidates.length) return null;

    return candidates[Math.floor(Math.random() * candidates.length)];
}

function updateSpotlightCycle(elapsedTime) {
    if (spotlightCube) {
        // Runs its whole dwell, hovered or not - hover changes nothing
        if (elapsedTime - spotlightStartedAt > SPOTLIGHT_DWELL) {
            lastSpotlightCube = spotlightCube;
            spotlightCube = null;
            nextSpotlightAt = elapsedTime + randomBetween(...SPOTLIGHT_GAP);
        }

        return;
    }

    if (elapsedTime < nextSpotlightAt) return;

    const cube = pickSpotlightCube();

    if (!cube) {
        // Nothing eligible right now - e.g. a one-cube grid with that one
        // cube under the cursor. Try again shortly rather than every frame.
        nextSpotlightAt = elapsedTime + randomBetween(...SPOTLIGHT_GAP);
        return;
    }

    spotlightCube = cube;
    spotlightStartedAt = elapsedTime;
    spotlightRotatePeriodX = randomBetween(...SPOTLIGHT_ROTATE_PERIOD);
    spotlightRotatePeriodZ = randomBetween(...SPOTLIGHT_ROTATE_PERIOD);
}

// Function to handle mouse move
function onMouseMove(event) {
    if (viewState !== 'catalog') return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersections with cubes
    const intersects = raycaster.intersectObjects(cubes);
    const cube = intersects.length > 0 ? findCube(intersects[0].object) : null;

    hoveredCube = cube;
}

/**
 * Orbiting the catalog ends in a click, so remember where the press started
 * and treat anything that travelled as a drag rather than a selection.
 */
const DRAG_THRESHOLD = 5; // px
let pointerDownAt = null;

window.addEventListener('pointerdown', (event) => {
    pointerDownAt = { x: event.clientX, y: event.clientY };
});

function wasDrag(event) {
    if (!pointerDownAt) return false;

    return Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y) > DRAG_THRESHOLD;
}

/**
 * The send-off after a project is clicked: a boom - one shockwave out from
 * the chosen cube that knocks every other cube outward and up towards the
 * camera in an instant - then a moment's hang, then a slow fall down the
 * screen, out past the bottom edge, while the chosen one holds still. No
 * oscillation and no rotation anywhere. The camera starts moving in while
 * they're still falling. Like the rest of the catalog's motion it's a pure
 * function of the clock - here, time since the click.
 */
const BOOM_PUSH = 3; // units each cube is knocked out, away from the chosen one
const BOOM_LIFT = 4; // units each cube is knocked up towards the camera
const BOOM_SNAP = 0.07; // seconds - time constant of the knock; ~0.2s to all but arrive
const BOOM_WAVE = 0.006; // seconds for the shockwave to travel one unit
const BOOM_HANG = 0.3; // seconds after the click before the cubes start to fall
const DROP_STAGGER = 0.2; // seconds - cubes let go at slightly different moments
const DROP_FALL = 1.4; // seconds to fall off the screen
const DROP_OPEN_AFTER = 0.65; // seconds into the fall that the camera starts moving in
const OPEN_CAMERA_EASE = 'power2.out'; // see openProject
const OPEN_CAMERA_DURATION_LOADING = 1; // seconds - the move in while the model is still downloading
const DROP_DISTANCE = 75; // units down the screen - clears it at any aspect
const DROP_SINK = 0.15; // share of the fall that also sinks away from the camera

let droppingFrom = null;
let dropStartedAt = -Infinity;

function startDrop(cube) {
    // A pile's physics engine starts downloading now, while the grid falls
    if (cube.userData.project?.drop) loadPhysics();

    viewState = 'dropping';
    resetFlow();
    droppingFrom = cube;
    dropStartedAt = clock.getElapsedTime();
    // Square to the pebble again, however far a pile's ground turned last time
    getDissolve(cube).rotation.y = 0;
    hoveredCube = null;

    cubes.forEach((other) => {
        // Out along the screen, away from the chosen cube
        const away = other.position.clone().sub(cube.position).setY(0);

        other.userData.drop = {
            from: other.position.clone(),
            delay: Math.random() * DROP_STAGGER,
            lag: away.length() * BOOM_WAVE,
            away: away.lengthSq() > 0 ? away.normalize() : away,
        };
    });

    // Partway through the fall rather than after it, so the camera's move
    // follows straight on from it. The fall keeps playing out in detail
    // view (see placeDroppingCube) while openProject fades the cubes out.
    gsap.delayedCall(BOOM_HANG + DROP_OPEN_AFTER, () => openProject(cube));
}

function dropInProgress(elapsedTime) {
    return elapsedTime - dropStartedAt < BOOM_HANG + DROP_STAGGER + DROP_FALL;
}

function updateDroppingCube(cube, elapsedTime) {
    cube.material.opacity = restingFaceOpacity(cube);
    cube.material.color.copy(restingFaceColor(cube));
    cube.material.emissive.setRGB(0, 0, 0);
    cube.userData.edges.material.opacity = 1;
    cube.userData.edges.material.color.copy(restingRimColor(cube));
    if (cube.userData.content) cube.userData.content.scale.setScalar(cube.userData.contentBaseScale);

    // The clicked pebble's glass, rim and rock give way to its dissolve
    if (cube === droppingFrom) {
        const fade = 1 - Math.min((elapsedTime - dropStartedAt) / DISSOLVE_FADE, 1);
        cube.material.opacity = restingFaceOpacity(cube) * fade;
        cube.userData.edges.material.opacity = fade;
        if (cube.userData.content) cube.userData.content.scale.setScalar(cube.userData.contentBaseScale * fade);
    }

    placeDroppingCube(cube, elapsedTime);
}

/**
 * Pose only, no material - this part carries on after openProject, which
 * is fading the cubes out while they finish falling.
 */
function placeDroppingCube(cube, elapsedTime) {
    const { from, delay, lag, away } = cube.userData.drop;

    // The chosen cube holds still where it was clicked
    if (cube === droppingFrom) {
        cube.position.copy(from);
        cube.rotation.set(0, 0, 0);
        cube.scale.setScalar(1);
        return;
    }

    const t = elapsedTime - dropStartedAt;

    // Gravity: distance grows with the square of time since letting go.
    // Down the screen is world +Z from the catalog's overhead camera; the
    // slight sink away from it also keeps falling cubes behind the chosen one
    const fall = Math.min(Math.max((t - BOOM_HANG - delay) / DROP_FALL, 0), 1);
    const drop = fall ** 2;

    // The boom: a single knock out from the chosen cube and up towards the
    // camera (the cube grows as it rises), arriving at once and settling
    // exponentially - fast, then dead still, no bounce. The shockwave
    // reaches cubes further from the chosen one a few hundredths later.
    const sinceHit = Math.max(t - lag, 0);
    const knock = 1 - Math.exp(-sinceHit / BOOM_SNAP);

    cube.position.set(
        from.x + away.x * BOOM_PUSH * knock,
        // The lift gives way as the cube falls, so it passes behind the chosen one
        from.y + BOOM_LIFT * knock * (1 - fall) - DROP_SINK * DROP_DISTANCE * drop,
        from.z + away.z * BOOM_PUSH * knock + DROP_DISTANCE * drop,
    );

    // Square and straight all the way down - no tumble, no sideways drift
    cube.rotation.set(0, 0, 0);
    cube.scale.setScalar(1);
}

// Picking a cube in the catalog, on a press released over the canvas. Only
// the main mouse button; a touch or pen always counts.
function onCanvasSelect(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (viewState !== 'catalog' || wasDrag(event)) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersections with cubes
    const intersects = raycaster.intersectObjects(cubes);

    if (intersects.length === 0) return;

    // Get the cube that was clicked, and the project sitting in its slot
    const cube = findCube(intersects[0].object);

    if (!cube) return;

    if (cube.userData.project) {
        startDrop(cube);
    } else {
        // Empty slots have nothing to open yet - say so rather than ignore
        // the click. Clicking again restarts the timer.
        emptyTagCube = cube;
        emptyTagShownAt = clock.getElapsedTime();
    }
}

/**
 * Detail view: the project's model on one half of the screen, its text on
 * the other.
 */
function openProject(cube) {
    const project = cube.userData.project;

    viewState = 'detail';
    selectedCube = cube;
    hoveredCube = null;

    // The cube parents the detail model, so any residual spotlight rock or
    // jump would carry straight into the one-point elevation: a tilt would
    // skew edges that need to stay square to the canvas, and a residual
    // scale would render the model larger or smaller than it actually is.
    cube.rotation.set(0, 0, 0);
    cube.scale.setScalar(1);

    // Hold the catalog still and sink it into the background, so the project
    // is the only thing competing for attention
    cubes.forEach((other) => {
        // The faces fade to nothing but keep writing depth, which hides the
        // cube's own back edges and flattens the perspective away
        other.material.depthWrite = false;

        // Only the project being looked at keeps its frame. Square-on, the
        // rest of the grid lines up into a lattice of rectangles behind the
        // model rather than scattering into the distance, so it goes entirely.
        gsap.to(other.material, { opacity: 0, duration: 0.8, ease: 'power2.out' });
        // The clicked pebble included: it has dissolved, and the project
        // stands on its own in the fog
        gsap.to(other.userData.edges.material, {
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
        });

        if (other.userData.content) other.userData.content.visible = false;
    });

    // The face fades out over the next 0.8s rather than vanishing
    // instantly, so a residual glow colour would otherwise show through as
    // a brief orange tint while it fades - reset both, for the same reason
    // rotation and scale are reset above.
    markVisited(cube);
    cube.material.color.copy(restingFaceColor(cube));
    cube.material.emissive.setRGB(0, 0, 0);
    cube.userData.edges.material.color.copy(restingRimColor(cube));

    // Show the text straight away - it costs nothing and gives the click an
    // answer while the model is still downloading
    showProject(project);

    // The elevation is the point of this view, so nothing rotates it off-axis
    controls.autoRotate = false;

    // ...but the visitor may orbit it by hand
    controls.enabled = true;

    // The grey fog rolls in behind the project as the camera moves in
    fog.classList.add('is-in');

    // The first double-tap hint waits until the points have gathered
    tapHintNext = GATHER_DURATION + TAP_HINT_AFTER_GATHER;

    enterDetailProjection();

    // This runs while the rest of the grid is still falling, which already
    // carries the motion - so the camera sets off at speed and settles,
    // rather than easing in from a standstill that reads as a pause
    const ease = OPEN_CAMERA_EASE;

    if (cube.userData.detail) {
        cube.userData.detail.visible = true;
        cube.userData.detail.rotation.y = modelStartYaw(project);
        cube.userData.detail.userData.pile?.restart();
        cube.userData.detailRotateStartTime = clock.getElapsedTime();
        setProjectStatus(null);
        frameDetail(cube, { ease });
        return;
    }

    // Frame the cube now, then re-frame once the model is inside it
    setProjectStatus('Loading model');
    const openMoveEndsAt = clock.getElapsedTime() + OPEN_CAMERA_DURATION_LOADING;
    frameDetail(cube, { duration: OPEN_CAMERA_DURATION_LOADING, ease });

    loadPointCloudWithShaderMaterial({
        glbPath: assetUrl(project.detailModel),
        parentObject: cube,
        gather: Boolean(project.gather),
        points: project.points,
        drop: project.drop,
        // Say so rather than leave "Loading model" up forever, and keep the
        // real error for the browser's console
        onError: (error) => {
            console.error('Could not load', project.detailModel, error);
            if (selectedCube === cube) setProjectStatus('The model could not be loaded');
        },
        onLoaded: (model) => {
            cube.userData.detail = model;
            model.rotation.y = modelStartYaw(project);

            // The visitor may have gone back while this was downloading
            if (viewState !== 'detail' || selectedCube !== cube) {
                model.visible = false;
                return;
            }

            setProjectStatus(null);
            cube.userData.detailRotateStartTime = clock.getElapsedTime();

            // The model is a child of the cube, so framing the cube frames
            // both together. The drawer may already be open if it loaded
            // slowly enough for the visitor to pull it out before this ran.
            if (drawerOpen) {
                frameWithDrawerOpen(cube);
                return;
            }

            // Loaded while the move in is still under way: carry on into the
            // new frame within the time left, at speed, rather than restart
            // from a standstill - which would stall the zoom halfway
            const remaining = openMoveEndsAt - clock.getElapsedTime();

            if (remaining > 0) {
                frameDetail(cube, { duration: Math.max(remaining, 0.4), ease });
            } else {
                frameDetail(cube);
            }
        },
    });
}

function closeProject() {
    if (viewState !== 'detail') return;

    const cube = selectedCube;
    selectedCube = null;

    // Not 'catalog' yet - see below. 'returning' places the cubes back home
    // each frame, wherever the drop sent them, without touching the
    // opacity the reveal is fading in
    viewState = 'returning';

    hideProject();
    setProjectStatus(null);
    controls.autoRotate = false;
    controls.enabled = false;
    fog.classList.remove('is-in');
    tapHint.classList.remove('is-showing');
    tapHintNext = Infinity;

    if (cube && cube.userData.detail) cube.userData.detail.visible = false;
    if (cube && cube.userData.dissolve) cube.userData.dissolve.visible = false;

    /**
     * The camera is still parked close against the clicked cube's own
     * faces at this instant - fitCameraToGrid's pull-back starts slow
     * (power2.inOut) and only clears the cube's own small bounding box
     * partway in. Revealing the grid before that leaves you looking at
     * the inside of a now-opaque, depth-writing box from point-blank
     * range. revealDelay holds the reveal back until the camera has
     * retreated clear of it.
     *
     * That alone isn't enough, though: `viewState` flips to 'catalog'
     * below only once this whole reveal finishes, not immediately. Flip
     * it right away instead and the very next frame's catalog update
     * loop (`updateCube`/`updateIdleCube`) would call every cube back to
     * its resting state - opacity included - as a plain, unconditional
     * assignment, since a cube's visual state is a pure function of its
     * mode each frame, not a diff against whatever a tween happens to be
     * mid-way through writing. That function runs after these tweens
     * start, every frame, for the rest of the fade, so it would win every
     * time and the opacity tween below would have no visible effect at
     * all - caught by logging the actual opacity value frame by frame
     * after closing in a real browser: it read 1 within a single frame of
     * calling this, regardless of any delay or duration given here.
     */
    const revealDelay = 0.35;
    const revealDuration = 0.7;

    // Bring the catalog back
    cubes.forEach((other) => {
        gsap.delayedCall(revealDelay, () => { other.material.depthWrite = true; });

        gsap.to(other.material, { opacity: restingFaceOpacity(other), duration: revealDuration, ease: 'power2.inOut', delay: revealDelay });
        gsap.to(other.userData.edges.material, { opacity: 1, duration: revealDuration, ease: 'power2.inOut', delay: revealDelay });

        other.material.color.copy(restingFaceColor(other));

        other.material.emissive.setRGB(0, 0, 0);
        other.userData.edges.material.color.copy(restingRimColor(other));
        other.visible = true;

        if (other.userData.content) other.userData.content.visible = true;
    });

    gsap.delayedCall(revealDelay + revealDuration, () => { viewState = 'catalog'; });

    exitDetailProjection(1.1);
    fitCameraToGrid({ animate: true });
}

/**
 * Double-click (or double-tap) on the model zooms in towards the spot under
 * the pointer; doing it again zooms back out to the view it came from. The
 * spot is the nearest point of the cloud along the pointer's ray, so it
 * zooms to what was actually tapped; if the tap missed the model, it zooms
 * towards the middle of the view instead. The viewing direction is kept,
 * so it's a straight move in, not a turn.
 */
const DETAIL_ZOOM = 0.4; // the camera ends up this fraction of its distance away
const DETAIL_ZOOM_DURATION = 0.9; // seconds
const DOUBLE_TAP_TIME = 350; // ms between taps, by when they happened
const DOUBLE_TAP_DISTANCE = 30; // px between taps

const zoomRaycaster = new THREE.Raycaster();
zoomRaycaster.params.Points.threshold = 0.06;

function toggleDetailZoom(clientX, clientY) {
    if (viewState !== 'detail' || !selectedCube) return;

    if (detailZoomed) {
        if (drawerOpen) {
            frameWithDrawerOpen(selectedCube, { duration: DETAIL_ZOOM_DURATION });
        } else {
            frameDetail(selectedCube, { duration: DETAIL_ZOOM_DURATION });
        }
        return;
    }

    const pointer = new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1,
    );
    zoomRaycaster.setFromCamera(pointer, camera);

    const model = selectedCube.userData.detail;
    const hits = model && model.visible ? zoomRaycaster.intersectObject(model, true) : [];
    const aim = hits.length ? hits[0].point.clone() : controls.target.clone();

    // Same direction of view, closer in, centred on the spot - in the space
    // left of the drawer when it's open beside the model, not behind it
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(DETAIL_ZOOM);
    const { mode, fraction } = getPanelLayout();
    const shift = new THREE.Vector3();
    if (drawerOpen && mode === 'side' && camera.isPerspectiveCamera) {
        const halfHeight = offset.length() * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        shift.set(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(fraction * halfHeight * aspectRatio);
    }
    moveCamera(aim.clone().add(offset).add(shift), aim.clone().add(shift), DETAIL_ZOOM_DURATION);
    detailZoomed = true;

    // Clear a hint that's mid-tap; the next one comes round as usual, zoomed
    // in or not
    tapHint.classList.remove('is-showing');
}

/**
 * Every few seconds, a touch point turns up over a random point of the open
 * model and taps twice - a hint that double-click/double-tap zooms in. First once the
 * points have gathered, then every TAP_HINT_GAP seconds, at a new point each
 * time; never while zoomed in, with the drawer open or the camera moving,
 * and never again once the visitor has zoomed. `since` is seconds since the
 * model was shown.
 */
const tapHintPoint = new THREE.Vector3();

function maybeShowTapHint(model, since) {
    if (since < tapHintNext) return;

    tapHintNext = since + TAP_HINT_GAP;

    // Not now - try again next time round. Zoomed in is fine: there it
    // invites the double-tap back out. So is the drawer on a wide screen,
    // where it sits beside the model; on a narrow one it covers it.
    const { mode, fraction } = getPanelLayout();
    if ((drawerOpen && mode !== 'side') || cameraOrientationLocked) return;

    // Clear of the drawer on the right, when it's open beside the model
    const maxX = Math.min(0.7, 1 - 2 * fraction - 0.15);

    const points = model.userData.points;
    if (!points || !model.visible) return;

    // A random point of the cloud that's comfortably on screen, clear of
    // the bar along the top. Zoomed in, most of the cloud is off screen, so
    // allow plenty of tries - each is one projected point.
    const positions = points.geometry.attributes.position;
    for (let tries = 0; tries < 60; tries++) {
        tapHintPoint.fromBufferAttribute(positions, Math.floor(Math.random() * positions.count));
        points.localToWorld(tapHintPoint).project(camera);

        if (tapHintPoint.x > -0.7 && tapHintPoint.x < maxX && tapHintPoint.y > -0.7 && tapHintPoint.y < 0.5) {
            tapHint.style.left = `${(tapHintPoint.x + 1) / 2 * screenWidth}px`;
            tapHint.style.top = `${(1 - tapHintPoint.y) / 2 * screenHeight}px`;

            // Restart the animation even if the last one hasn't finished
            tapHint.classList.remove('is-showing');
            void tapHint.offsetWidth;
            tapHint.classList.add('is-showing');
            return;
        }
    }
}

// A mouse sends dblclick; a finger often doesn't, so taps are timed by hand.
// Some browsers do send dblclick for a double-tap as well, which would zoom
// in and straight back out - so dblclick only counts for a mouse.
let lastPointerType = 'mouse';
canvas.addEventListener('pointerdown', (event) => { lastPointerType = event.pointerType; });

canvas.addEventListener('dblclick', (event) => {
    if (lastPointerType === 'mouse') toggleDetailZoom(event.clientX, event.clientY);
});

let lastTap = null;
canvas.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse' || wasDrag(event)) return;

    // The event's own time, not when it was handled - a busy frame can
    // delay handling enough to split a real double-tap in two
    const now = event.timeStamp;
    const isDouble = lastTap
        && now - lastTap.time < DOUBLE_TAP_TIME
        && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < DOUBLE_TAP_DISTANCE;

    if (isDouble) {
        lastTap = null;
        toggleDetailZoom(event.clientX, event.clientY);
    } else {
        lastTap = { time: now, x: event.clientX, y: event.clientY };
    }
});

// Add event listener for mouse move
window.addEventListener('mousemove', onMouseMove);
// Leaving the window lets go of the pebble it was over
document.documentElement.addEventListener('mouseleave', () => { hoveredCube = null; });

// Pointer, not mouse, so a finger dragged across the grid stirs it too
window.addEventListener('pointermove', trackFlowPointer);

// Selecting answers the press's own pointerup on the canvas, not a `click`
// on window: Safari on iPhone and iPad doesn't send `click` for a tap on a
// plain canvas, so a window-level click listener never heard it and a tap
// on a cube silently did nothing. Pointer events arrive in every browser.
canvas.addEventListener('pointerup', onCanvasSelect);

// Ways back to the catalog
projectClose.addEventListener('click', (event) => {
    // Keep this click to the button itself
    event.stopPropagation();
    closeProject();
});

drawerHandle.addEventListener('click', (event) => {
    event.stopPropagation();
    setDrawer(!drawerOpen);
});

window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    // Escape backs out one step at a time: the drawer first, then the project
    if (drawerOpen) {
        setDrawer(false);
        return;
    }

    closeProject();
});




