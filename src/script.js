import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import GUI from 'lil-gui'
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

import pointCloudVertexShader from './shaders/pointCloud/vertex.glsl';
import pointCloudFragmentShader from './shaders/pointCloud/fragment.glsl';

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
const spacing = 1.2;

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
const HOVER_FACE_OPACITY = 0.3;
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
        // altogether for the square-on default. These were fitted to a
        // screenshot of the shot wanted, so they reproduce it.
        view: { elevation: 49, azimuth: 4, turn: 145 },

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
            { src: '', alt: '', caption: '' },
            { src: '', alt: '', caption: '' },
            { src: '', alt: '', caption: '' },
        ],
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
const projectTag = document.querySelector('#project-tag');

// Whether the pointer is over the page at all - a cursor that has left the
// window shouldn't keep a label lit on the cube it left from
let pointerInPage = true;
document.documentElement.addEventListener('mouseleave', () => { pointerInPage = false; });
document.documentElement.addEventListener('mouseenter', () => { pointerInPage = true; });
const fog = document.querySelector('#fog');
const emptyTag = document.querySelector('#empty-tag');
const cubeTagAnchor = new THREE.Vector3();
const PROJECT_TAG_NEAR = 2.8; // units from a cube's centre - full strength within this
const PROJECT_TAG_FAR = 5.5; // units - gone by here, about the next cube along
const EMPTY_TAG_DURATION = 1.6; // seconds "Still empty..." stays up after a click
const EMPTY_TAG_FADE = 0.3; // seconds of that spent fading out
let emptyTagCube = null;
let emptyTagShownAt = 0;
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

    // Opening pulls in for a closer, more atmospheric crop instead of just
    // making room for the drawer; closing returns to the full-fit view
    if (!reframe || !selectedCube) return;

    if (open) {
        frameDetailCloseup(selectedCube, { duration: 1.1 });
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
const GATHER_DURATION = 3.6; // seconds from opening the project to the last point home
const GATHER_SPREAD = 0.4; // share of that over which points set off
const GATHER_SWIRL = 2.4; // radians the scatter turns through on the way in
const GATHER_SCATTER = 1.5; // scatter radius, as a multiple of the model's own half-width

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

function setGather(model, progress) {
    // A cloud loaded without gather attributes would fly in from its origin
    if (!model.userData.gathers) return;

    model.userData.pointMaterials?.forEach((material) => {
        material.uniforms.uGather.value = progress;
    });
}

function loadPointCloudWithShaderMaterial({
    glbPath,
    parentObject,
    onLoaded,
    onProgress,
    onError,
    gather = false,
}) {

    // console.log(parentObject);
    

    gltfLoader.load(glbPath, (gltf) => {
        const materials = [];

        gltf.scene.traverse((child) => {
            if (child.isPoints) {
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
                    vertexShader: pointCloudVertexShader,
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
                        uGatherSpread: { value: GATHER_SPREAD },
                        uGatherSwirl: { value: GATHER_SWIRL },
                    },
                });

                pointCloudMaterials.push(shaderMaterial);
                materials.push(shaderMaterial);
                refreshPointScale();

                // Replace the material with the custom ShaderMaterial
                child.material = shaderMaterial;
            }
        });

        gltf.scene.userData.pointMaterials = materials;
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

// A full turn every 40s - slow enough to read as ambient rather than as
// something to watch, same spirit as the catalog's own wander. Turns the
// model itself, not the camera - see DECISIONS.md for why that distinction
// matters here.
const DETAIL_ROTATE_SPEED = (2 * Math.PI) / 40;

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
const WANDER_XZ_AMPLITUDE = 0.38; // horizontal sway - kept under half the 1-unit gap between cubes
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
 * One cube at a time, continuously: holds at its slot, jumps - a quick
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
const SPOTLIGHT_FADE = 0.6; // seconds to ramp the effect in, and back out, at each end of the dwell
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

createPlayground();

// Everything the catalog loads at start-up has registered by now
sealBoot();

// Cubes
function createPlayground() {
    clearCubes();

    // One cube per slot. The count is fixed, so a project always has a home.
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
        const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const cubeMaterial = new THREE.MeshStandardMaterial({
            color: cubesColor,
            metalness: 0.2,
            roughness: 0.6,
            transparent: true,
            opacity: CUBE_FACE_OPACITY,
        });

        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

        // Add edges for a visible border
        const edgesGeometry = new THREE.EdgesGeometry(cube.geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: selectedCubeColor,
            transparent: true,
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        cube.add(edges); // Attach edges to the cube

        // Store edges in userData for future reference
        cube.userData.edges = edges;

        // Which slot this is, and the project sitting in it (null when empty)
        cube.userData.slot = slot;
        cube.userData.project = projectBySlot.get(slot) ?? null;

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

        const content = scene.clone();
        content.position.set(0, -1, 0);
        content.scale.set(0.2, 0.2, 0.2);
        cube.add(content);
        cube.userData.content = content;
        cube.userData.contentBaseScale = 0.2;

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

    // Grid extents, measured to the outer faces of the edge cubes
    const gridWidth = (gridShape.cols - 1) * step + cubeSize;
    const gridDepth = (gridShape.rows - 1) * step + cubeSize;
    const margin = 1.15;

    const halfFov = THREE.MathUtils.degToRad(CATALOG_FOV) / 2;
    const distanceForDepth = (gridDepth * margin) / 2 / Math.tan(halfFov);
    const distanceForWidth = (gridWidth * margin) / 2 / (Math.tan(halfFov) * perspectiveCamera.aspect);

    // Clear the highest point a cube reaches while it bobs
    const cubeTop = cubeSize / 2 + 3;
    const height = Math.max(distanceForDepth, distanceForWidth) + cubeTop;

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

function frameDetail(object, { duration = 1.6, ease } = {}) {
    detailZoomed = false;

    // A project with its own view is framed on the cube alone. Seen from
    // above at an angle, the bounding box of the model's scattered points
    // balloons and changes size as the model turns; the cube is the frame
    // the shot is composed around, and stray points running off the edges
    // read fine.
    const framesCube = Boolean(object.userData.project?.view);
    const box = framesCube
        ? new THREE.Box3().setFromCenterAndSize(object.position, new THREE.Vector3().setScalar(cubeSize))
        : new THREE.Box3().setFromObject(object);
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

    const { mode, fraction } = getPanelLayout();
    const side = mode === 'side';
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

        distance = margin * Math.max(forWidth, forHeight);
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
    if (framesCube && !ortho && !side && !drawerOpen) {
        // Highest point of the cube on screen, from its actual corners
        const eye = center.clone().addScaledVector(toCamera, distance);
        let top = -Infinity;
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
            const v = new THREE.Vector3(sx * half.x, sy * half.y, sz * half.z).add(center).sub(eye);
            top = Math.max(top, v.dot(up) / (v.dot(forward) * tan));
        }
        ndcY = -Math.min(barShare, Math.max(0, top - (1 - 2 * barShare)));
    }

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
        frameDetailCloseup(selectedCube, { duration: 0.4 });
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
        updateFlow(frameTime);
        cubes.forEach((cube) => {
            updateCube(cube, elapsedTime);
            applyFlow(cube);
        });
    } else if (viewState === 'dropping') {
        cubes.forEach((cube) => updateDroppingCube(cube, elapsedTime));
    } else if (viewState === 'returning') {
        // Back home before they fade in, wherever the drop left them
        cubes.forEach((cube) => placeAtRest(cube, elapsedTime));
    } else {
        // The camera starts moving in before the drop has finished - the
        // rest of the fall plays out under openProject's fade
        if (dropInProgress(elapsedTime)) {
            cubes.forEach((cube) => { if (cube !== selectedCube) placeDroppingCube(cube, elapsedTime); });
        }

        if (selectedCube && selectedCube.userData.detail) {
            // Turns the model itself, not the camera, so the cube's edges stay
            // square to the canvas - see DETAIL_ROTATE_SPEED
            const since = elapsedTime - selectedCube.userData.detailRotateStartTime;
            selectedCube.userData.detail.rotation.y = modelStartYaw(selectedCube.userData.project) + since * DETAIL_ROTATE_SPEED;

            // Replays from scattered each time the project opens, since
            // detailRotateStartTime is reset whenever the model is shown
            setGather(selectedCube.userData.detail, Math.min(since / GATHER_DURATION, 1));
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
    if (cube === hoveredCube) {
        updateHoveredCube(cube, elapsedTime);
    } else if (cube === spotlightCube) {
        updateSpotlightCube(cube, elapsedTime);
    } else {
        updateIdleCube(cube, elapsedTime);
    }
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
        const flow = cube.userData.flow ?? (cube.userData.flow = { x: 0, z: 0, vx: 0, vz: 0 });
        const home = cube.userData.slotPosition;

        // Where the pointer's motion would carry this cube right now
        let targetX = 0;
        let targetZ = 0;

        if (flowPointerKnown && home) {
            const distance = Math.hypot(home.x - flowPointer.x, home.z - flowPointer.z);
            const reach = Math.exp(-((distance / FLOW_RADIUS) ** 2));
            targetX = flowPointerVelocity.x * FLOW_CARRY * reach;
            targetZ = flowPointerVelocity.y * FLOW_CARRY * reach;

            const length = Math.hypot(targetX, targetZ);
            if (length > FLOW_MAX) {
                targetX *= FLOW_MAX / length;
                targetZ *= FLOW_MAX / length;
            }
        }

        // A damped spring towards that, integrated in small steps
        const steps = Math.ceil(dt / (1 / 120));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
            flow.vx += (FLOW_STIFFNESS * (targetX - flow.x) - FLOW_DAMPING * flow.vx) * h;
            flow.vz += (FLOW_STIFFNESS * (targetZ - flow.z) - FLOW_DAMPING * flow.vz) * h;
            flow.x += flow.vx * h;
            flow.z += flow.vz * h;
        }
    });
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

function updateIdleCube(cube, elapsedTime) {
    placeAtRest(cube, elapsedTime);
    cube.material.opacity = CUBE_FACE_OPACITY;
    cube.material.color.set(cubesColor);
    cube.material.emissive.setRGB(0, 0, 0);

    cube.userData.edges.material.opacity = 1;
    cube.userData.edges.material.color.set(selectedCubeColor);

    if (cube.userData.content) {
        cube.userData.content.scale.setScalar(cube.userData.contentBaseScale);
    }
}

// Quicker and more alert than the idle wander, since this cube is reacting
// to the cursor right now rather than drifting on its own.
const HOVER_JITTER_FREQUENCY = 18; // radians/second
const HOVER_JITTER_AMPLITUDE = 0.025;
const HOVER_SCALE_AMPLITUDE = 0.2;
const HOVER_CONTENT_PULSE_AMPLITUDE = 0.1;

function updateHoveredCube(cube, elapsedTime) {
    const base = cube.userData.slotPosition;
    const jitter = Math.sin(elapsedTime * HOVER_JITTER_FREQUENCY) * HOVER_JITTER_AMPLITUDE;
    cube.position.set(base.x + jitter, jitter, base.z);

    cube.rotation.set(0, 0, 0);
    cube.scale.setScalar(1 + Math.sin(elapsedTime * HOVER_JITTER_FREQUENCY) * HOVER_SCALE_AMPLITUDE);
    cube.material.opacity = HOVER_FACE_OPACITY;
    cube.material.color.set(selectedCubeColor);
    cube.material.emissive.setRGB(0, 0, 0);

    cube.userData.edges.material.opacity = 1;
    cube.userData.edges.material.color.set(selectedCubeColor);

    if (cube.userData.content) {
        const pulse = 1 + Math.sin(elapsedTime * HOVER_JITTER_FREQUENCY * 0.15) * HOVER_CONTENT_PULSE_AMPLITUDE;
        cube.userData.content.scale.setScalar(cube.userData.contentBaseScale * pulse);
    }
}

// Ramp the whole effect in, and back out, rather than popping into a fast
// rock on the first frame and snapping to rest the instant the dwell ends -
// this is what makes it settle rather than just stop.
function spotlightIntensity(elapsedTime) {
    const since = elapsedTime - spotlightStartedAt;
    const fadeIn = Math.min(since / SPOTLIGHT_FADE, 1);
    const fadeOut = Math.min((SPOTLIGHT_DWELL - since) / SPOTLIGHT_FADE, 1);

    return Math.max(0, Math.min(fadeIn, fadeOut));
}

function updateSpotlightCube(cube, elapsedTime) {
    const since = elapsedTime - spotlightStartedAt;
    const intensity = spotlightIntensity(elapsedTime);

    const pulse = Math.sin((since / SPOTLIGHT_PULSE_PERIOD) * Math.PI * 2); // -1..1
    const glow = (pulse + 1) / 2; // 0..1
    const lift = Math.max(0, pulse); // only the upward half of each beat

    // Holds at its slot rather than also wandering, lifted on the upward
    // half of each beat - a jump, not a drift - amid the others around it.
    const base = cube.userData.slotPosition;
    cube.position.set(base.x, lift * SPOTLIGHT_JUMP_HEIGHT * intensity, base.z);

    cube.rotation.x = Math.sin((since / spotlightRotatePeriodX) * Math.PI * 2) * SPOTLIGHT_ROTATE_AMPLITUDE * intensity;
    cube.rotation.z = Math.sin((since / spotlightRotatePeriodZ) * Math.PI * 2 + 1.7) * SPOTLIGHT_ROTATE_AMPLITUDE * intensity;
    cube.scale.setScalar(1 + pulse * SPOTLIGHT_CUBE_SCALE_AMPLITUDE * intensity);

    // Clear glass at rest; the glow fills it in
    cube.material.opacity = CUBE_FACE_OPACITY + (SPOTLIGHT_FACE_OPACITY - CUBE_FACE_OPACITY) * glow * intensity;

    // Blink the whole cube - face and edges alike - between its resting
    // colours and the spotlight's orange, never fully off so it
    // reads as glowing rather than flickering. The face glows through its
    // emissive colour rather than its base colour: the base colour is lit
    // by the scene's cyan lights, which turn an orange green - and it's
    // dimmed as the glow rises, or that cyan-lit grey washes the orange out
    // to tan.
    cube.material.color.copy(cubesColor).multiplyScalar(1 - glow * intensity * SPOTLIGHT_FACE_DIM);
    spotlightFaceColor.copy(spotlightGlowColor).multiplyScalar(glow * intensity * SPOTLIGHT_FACE_GLOW);
    cube.material.emissive.copy(spotlightFaceColor);

    spotlightEdgeColor.copy(selectedCubeColor).lerp(spotlightGlowColor, glow * intensity);
    cube.userData.edges.material.color.copy(spotlightEdgeColor);
    cube.userData.edges.material.opacity = 1 - intensity * 0.35 * (1 - glow);

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
    cubeTagAnchor.set(0, cubeSize / 2, cubeSize * 0.36);
    cube.localToWorld(cubeTagAnchor).project(camera);

    const x = (cubeTagAnchor.x + 1) / 2 * screenWidth;
    const y = (1 - cubeTagAnchor.y) / 2 * screenHeight;

    tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
}

/**
 * The catalog's two tags: "Project 01"... on the cube under or nearest the
 * pointer, fading in as the pointer comes close and out as it moves away,
 * and "Still empty..." for a moment on an empty slot that was just
 * clicked. When both land on the same cube, the answer to the click wins.
 */
function updateCubeTags(elapsedTime) {
    const inCatalog = viewState === 'catalog';

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

    // The cube under the pointer, or failing that the nearest one to it
    let labelCube = null;
    let labelStrength = 0;

    if (inCatalog && hoveredCube) {
        labelCube = hoveredCube;
        labelStrength = 1;
    } else if (inCatalog && flowPointerKnown && pointerInPage) {
        let nearest = Infinity;
        cubes.forEach((cube) => {
            const distance = Math.hypot(cube.position.x - flowPointer.x, cube.position.z - flowPointer.z);
            if (distance < nearest) {
                nearest = distance;
                labelCube = cube;
            }
        });
        labelStrength = 1 - THREE.MathUtils.smoothstep(nearest, PROJECT_TAG_NEAR, PROJECT_TAG_FAR);
    }

    if (labelCube === emptyTagCube) labelStrength = 0;

    if (labelCube && labelStrength > 0) {
        const label = projectLabel(labelCube);
        if (projectTag.textContent !== label) projectTag.textContent = label;
        placeTagOnCube(projectTag, labelCube);
    }
    projectTag.style.opacity = labelStrength;
}

// "Project 01" to "Project 10", by grid slot
function projectLabel(cube) {
    return `Project ${String(cube.userData.slot + 1).padStart(2, '0')}`;
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
        // The visitor started hovering the very cube that is glowing - let
        // the hover take it over immediately rather than contesting it.
        const hovered = spotlightCube === hoveredCube;
        const dwelled = elapsedTime - spotlightStartedAt > SPOTLIGHT_DWELL;

        if (hovered || dwelled) {
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
    viewState = 'dropping';
    resetFlow();
    droppingFrom = cube;
    dropStartedAt = clock.getElapsedTime();
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
    cube.material.opacity = CUBE_FACE_OPACITY;
    cube.material.color.set(cubesColor);
    cube.material.emissive.setRGB(0, 0, 0);
    cube.userData.edges.material.opacity = 1;
    cube.userData.edges.material.color.set(selectedCubeColor);
    if (cube.userData.content) cube.userData.content.scale.setScalar(cube.userData.contentBaseScale);

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

// Function to handle mouse clicks
function onMouseClick(event) {
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
        gsap.to(other.userData.edges.material, {
            opacity: other === cube ? 0.3 : 0,
            duration: 0.8,
            ease: 'power2.out',
        });

        if (other.userData.content) other.userData.content.visible = false;
    });

    // The face fades out over the next 0.8s rather than vanishing
    // instantly, so a residual glow colour would otherwise show through as
    // a brief orange tint while it fades - reset both, for the same reason
    // rotation and scale are reset above.
    cube.material.color.set(cubesColor);
    cube.material.emissive.setRGB(0, 0, 0);
    cube.userData.edges.material.color.set(selectedCubeColor);

    // Show the text straight away - it costs nothing and gives the click an
    // answer while the model is still downloading
    showProject(project);

    // The elevation is the point of this view, so nothing rotates it off-axis
    controls.autoRotate = false;

    // ...but the visitor may orbit it by hand
    controls.enabled = true;

    // The grey fog rolls in behind the project as the camera moves in
    fog.classList.add('is-in');

    enterDetailProjection();

    // This runs while the rest of the grid is still falling, which already
    // carries the motion - so the camera sets off at speed and settles,
    // rather than easing in from a standstill that reads as a pause
    const ease = OPEN_CAMERA_EASE;

    if (cube.userData.detail) {
        cube.userData.detail.visible = true;
        cube.userData.detail.rotation.y = modelStartYaw(project);
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
                frameDetailCloseup(cube);
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

    if (cube && cube.userData.detail) cube.userData.detail.visible = false;

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

        gsap.to(other.material, { opacity: CUBE_FACE_OPACITY, duration: revealDuration, ease: 'power2.inOut', delay: revealDelay });
        gsap.to(other.userData.edges.material, { opacity: 1, duration: revealDuration, ease: 'power2.inOut', delay: revealDelay });

        other.material.color.set(cubesColor);

        other.material.emissive.setRGB(0, 0, 0);
        other.userData.edges.material.color.set(selectedCubeColor);
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
            frameDetailCloseup(selectedCube, { duration: DETAIL_ZOOM_DURATION });
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

    // Same direction of view, closer in, centred on the spot
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(DETAIL_ZOOM);
    moveCamera(aim.clone().add(offset), aim, DETAIL_ZOOM_DURATION);
    detailZoomed = true;
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

// Pointer, not mouse, so a finger dragged across the grid stirs it too
window.addEventListener('pointermove', trackFlowPointer);

// Add the click event listener
window.addEventListener('click', onMouseClick);

// Ways back to the catalog
projectClose.addEventListener('click', (event) => {
    // Keep this click from reaching onMouseClick on the way up
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




