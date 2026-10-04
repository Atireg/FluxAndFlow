import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import GUI from 'lil-gui'
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { Sky } from 'three/addons/objects/Sky.js'

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

/**
 * Colors 
 */
const cubesColor = new THREE.Color("rgb(167, 167, 167)").convertSRGBToLinear();
// const bordersColor = new THREE.Color("rgb(232, 237, 223)").convertSRGBToLinear();
const selectedCubeColor = new THREE.Color("rgb(192, 255, 252)").convertSRGBToLinear();
const backgroudCubesColor = new THREE.Color("rgb(190, 190, 190)").convertSRGBToLinear();
// The spotlight's own glow colour - a light red, distinct from the cyan
// the grid otherwise rests at, so a jumping cube reads as "look at me" and
// not as a different flavour of idle.
const spotlightGlowColor = new THREE.Color("#ff5c5c").convertSRGBToLinear();
const lightColor = new THREE.Color("rgb(194, 238, 255)");

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

const projectBySlot = new Map(projects.map((project) => [project.slot, project]));

/**
 * Project bar and description drawer
 *
 * The bar carries only what is needed to know where you are. The description
 * lives in a drawer parked off the edge of the screen, so by default the
 * model gets the whole canvas; pulling it out hands part of that back.
 */
const bar = document.querySelector('#bar');
const barTitle = document.querySelector('#project-title');
const barStatus = document.querySelector('#project-status');
const projectClose = document.querySelector('#project-close');

const drawer = document.querySelector('#drawer');
const drawerHandle = document.querySelector('#drawer-handle');
const drawerTitle = document.querySelector('#drawer-title');
const drawerMeta = document.querySelector('#project-meta');
const drawerBody = document.querySelector('#project-body');
const drawerCredits = document.querySelector('#project-credits');

let drawerOpen = false;

function hasDescription(project) {
    return Boolean(
        project.year || project.role || project.context || project.credits
        || (project.body && project.body.length)
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

    drawerCredits.textContent = project.credits ?? '';

    // Nothing written yet means nothing to pull out, so no handle appears
    const available = hasDescription(project);
    drawer.classList.toggle('is-available', available);
    drawer.setAttribute('aria-hidden', available ? 'false' : 'true');
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

    // The model makes room for the drawer, and takes it back when it closes
    if (reframe && selectedCube) frameDetail(selectedCube, { duration: 0.8 });
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
 * Loaders
 */
const textureLoader = new THREE.TextureLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(assetUrl('draco/'));

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

function loadPointCloudWithShaderMaterial({
    glbPath,
    parentObject,
    onLoaded,
}) {

    // console.log(parentObject);
    

    gltfLoader.load(glbPath, (gltf) => {
        gltf.scene.traverse((child) => {
            if (child.isPoints) {
                const geometry = child.geometry;
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
                    // scales[i] = Math.random();  
                    scales[i] = 1;  
                }

                geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
                // geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                // Define a custom ShaderMaterial
                const shaderMaterial = new THREE.ShaderMaterial({
                    // depthWrite: false,
                    depthTest: false,
                    blending: THREE.AdditiveBlending,
                    vertexColors: true,
                    vertexShader: pointCloudVertexShader,
                    fragmentShader: pointCloudFragmentShader,
                    uniforms:
                    {
                        // uTime: new THREE.Uniform(0),
                        uLightDirection: {value: lightDirection.normalize()},
                        uLightColor: {value: lightColor},
                        uPerlinTexture: new THREE.Uniform(perlinTexture),
                        uPointScale: { value: 1 },
                        uSizeAttenuation: { value: 1 }
                    },
                });

                pointCloudMaterials.push(shaderMaterial);
                refreshPointScale();

                // Replace the material with the custom ShaderMaterial
                child.material = shaderMaterial;
            }
        });

        // Add the GLTF model to the specified parent object
        parentObject.add(gltf.scene);

        if (onLoaded) onLoaded(gltf.scene);
    });

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
const lightDirection = new THREE.Vector3();
directionalLight.target.getWorldPosition(lightDirection);
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

const perlinTexture = textureLoader.load(assetUrl('textures/perlin.png'));
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
 * Sky
*/

const sky = new Sky();
sky.scale.set(1000, 1000, 1000)
scene.add(sky)

sky.material.uniforms['turbidity'].value = 5
sky.material.uniforms['rayleigh'].value = 3
sky.material.uniforms['mieCoefficient'].value = 0.8
sky.material.uniforms['mieDirectionalG'].value = 0.7
sky.material.uniforms['sunPosition'].value.set(0.6, -0.038, -0.95)

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
let viewState = 'catalog'; // 'catalog' | 'detail'
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
const WANDER_Y_AMPLITUDE_A = 1.0; // units
const WANDER_Y_AMPLITUDE_B = 0.5;
const WANDER_XZ_PERIOD = [12, 20];
const WANDER_XZ_AMPLITUDE = 0.18; // small horizontal sway

function createWander() {
    return {
        yA: { period: randomBetween(...WANDER_Y_PERIOD_A), phase: Math.random() * Math.PI * 2 },
        yB: { period: randomBetween(...WANDER_Y_PERIOD_B), phase: Math.random() * Math.PI * 2 },
        x: { period: randomBetween(...WANDER_XZ_PERIOD), phase: Math.random() * Math.PI * 2 },
        z: { period: randomBetween(...WANDER_XZ_PERIOD), phase: Math.random() * Math.PI * 2 },
    };
}

function wanderOffset(wander, elapsedTime) {
    const sine = (term) => Math.sin((elapsedTime / term.period) * Math.PI * 2 + term.phase);

    return {
        x: sine(wander.x) * WANDER_XZ_AMPLITUDE,
        y: sine(wander.yA) * WANDER_Y_AMPLITUDE_A + sine(wander.yB) * WANDER_Y_AMPLITUDE_B,
        z: sine(wander.z) * WANDER_XZ_AMPLITUDE,
    };
}

/**
 * Spotlight
 *
 * One cube at a time, continuously: holds at its slot, jumps - a quick
 * rock on two axes, a lift and a scale pulse on both the cube and its
 * thumbnail, edges blinking cyan to light red - for a fixed dwell, settles,
 * and hands off to another a beat later. Every cube is fair game, project
 * or empty: this is the grid feeling alive, not only an invitation to
 * click a project, though it still reads as exactly that where one exists.
 * Never the cube under the cursor, and never the one that just finished,
 * so it visibly moves rather than occasionally repeating itself.
 */
const SPOTLIGHT_GAP = [0.3, 0.6]; // seconds between one settling and the next starting
const SPOTLIGHT_DWELL = 5; // seconds a cube stays spotlighted
const SPOTLIGHT_FADE = 0.6; // seconds to ramp the effect in, and back out, at each end of the dwell
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
            opacity: 1,
            blending: THREE.AdditiveBlending,

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

        if (cube.userData.project) {
            addContentToCube(cube);
        }
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
function addContentToCube(cube) {
    const { project } = cube.userData;

    // Load 3D project representation
    gltfLoader.load(
        assetUrl(project.thumbModel),
        (gltf) => {
            const content = gltf.scene;
            content.position.set(0, -1, 0);
            content.scale.set(0.2, 0.2, 0.2);
            cube.add(content);
            cube.userData.content = content;
            cube.userData.contentBaseScale = 0.2;
        }
    );
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
        gsap.to(perspectiveCamera.position, { x: 0, y: height, z: 0, duration: 1.1, ease: 'power2.inOut' });
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.1, ease: 'power2.inOut' });
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
 * The camera sits square-on to the cube, looking along +X, so the cube's
 * vertical and horizontal edges stay parallel to the canvas. Under
 * perspective that is a one-point view - depth converges on a single central
 * vanishing point, nothing skews sideways. Under orthographic nothing
 * converges at all.
 */
const DETAIL_VIEW_OFFSET = new THREE.Vector3(-1, 0, 0); // camera sits on -X
const ORTHO_VIEW_DISTANCE = 50; // orthographic ignores distance; this just clears the scene

function frameDetail(object, { duration = 1.6 } = {}) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);

    const forward = DETAIL_VIEW_OFFSET.clone().negate();
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
    const margin = side
        ? DETAIL_MARGIN.side
        : (drawerOpen ? DETAIL_MARGIN.stackedOpen : DETAIL_MARGIN.stackedParked);

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
    const ndcY = (side ? 0 : fraction) - barShare;

    const offset = right.clone().multiplyScalar(-ndcX * halfHeight * aspectRatio)
        .add(up.clone().multiplyScalar(-ndcY * halfHeight));

    const position = center.clone().addScaledVector(DETAIL_VIEW_OFFSET, distance).add(offset);
    const target = center.clone().add(offset);

    if (!ortho) animateFov(DETAIL_FOV[mode], duration);

    gsap.to(camera.position, { x: position.x, y: position.y, z: position.z, duration, ease: 'power2.inOut' });
    gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration, ease: 'power2.inOut' });

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

// Changing the field of view changes how strongly depth converges, so the
// catalog and a project can each have their own lens
function animateFov(fov, duration) {
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
    if (selectedCube) frameDetail(selectedCube, { duration: 0.4 });
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Update smoke
    smokeMaterial.uniforms.uTime.value = elapsedTime;

    // The catalog's own motion - wander, hover, spotlight - only runs while
    // it is actually what's on screen. A cube simply holds wherever it was
    // the instant a project opens; openProject's own fade covers for it,
    // and the spotlight cycle's dwell/gap timers self-correct against the
    // clock once this resumes, however long detail view was open for, so
    // nothing needs pausing or resetting on the way in or out.
    if (viewState === 'catalog') {
        updateSpotlightCycle(elapsedTime);
        cubes.forEach((cube) => updateCube(cube, elapsedTime));
    }

    // Update controls
    controls.update();

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

function updateIdleCube(cube, elapsedTime) {
    const base = cube.userData.slotPosition;
    const offset = wanderOffset(cube.userData.wander, elapsedTime);
    cube.position.set(base.x + offset.x, offset.y, base.z + offset.z);

    cube.rotation.set(0, 0, 0);
    cube.scale.setScalar(1);
    cube.material.opacity = 1;
    cube.material.color.set(cubesColor);

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
    cube.material.opacity = 0.4;
    cube.material.color.set(selectedCubeColor);

    cube.userData.edges.material.opacity = 1;
    cube.userData.edges.material.color.set(selectedCubeColor);

    if (cube.userData.content) {
        const pulse = 1 + Math.sin(elapsedTime * HOVER_JITTER_FREQUENCY * 0.15) * HOVER_CONTENT_PULSE_AMPLITUDE;
        cube.userData.content.scale.setScalar(cube.userData.contentBaseScale * pulse);
    }
}

function updateSpotlightCube(cube, elapsedTime) {
    const since = elapsedTime - spotlightStartedAt;

    // Ramp the whole effect in, and back out, rather than popping into a
    // fast rock on the first frame and snapping to rest the instant the
    // dwell ends - this is what makes it settle rather than just stop.
    const fadeIn = Math.min(since / SPOTLIGHT_FADE, 1);
    const fadeOut = Math.min((SPOTLIGHT_DWELL - since) / SPOTLIGHT_FADE, 1);
    const intensity = Math.max(0, Math.min(fadeIn, fadeOut));

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
    cube.material.opacity = 1;

    // Blink the whole cube - face and edges alike - between its resting
    // colours and the spotlight's own light red, never fully off so it
    // reads as glowing rather than flickering.
    spotlightFaceColor.copy(cubesColor).lerp(spotlightGlowColor, glow * intensity);
    cube.material.color.copy(spotlightFaceColor);

    spotlightEdgeColor.copy(selectedCubeColor).lerp(spotlightGlowColor, glow * intensity);
    cube.userData.edges.material.color.copy(spotlightEdgeColor);
    cube.userData.edges.material.opacity = 1 - intensity * 0.35 * (1 - glow);

    if (cube.userData.content) {
        const contentScale = cube.userData.contentBaseScale * (1 + pulse * SPOTLIGHT_SCALE_AMPLITUDE * intensity);
        cube.userData.content.scale.setScalar(contentScale);
    }
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

    // Empty slots have nothing to open yet
    if (cube && cube.userData.project) openProject(cube);
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
    // a brief red tint while it fades - reset both, for the same reason
    // rotation and scale are reset above.
    cube.material.color.set(cubesColor);
    cube.userData.edges.material.color.set(selectedCubeColor);

    // Show the text straight away - it costs nothing and gives the click an
    // answer while the model is still downloading
    showProject(project);

    // The elevation is the point of this view, so nothing rotates it off-axis
    controls.autoRotate = false;

    enterDetailProjection();

    if (cube.userData.detail) {
        cube.userData.detail.visible = true;
        setProjectStatus(null);
        frameDetail(cube);
        return;
    }

    // Frame the cube now, then re-frame once the model is inside it
    setProjectStatus('Loading model');
    frameDetail(cube, { duration: 1 });

    loadPointCloudWithShaderMaterial({
        glbPath: assetUrl(project.detailModel),
        parentObject: cube,
        onLoaded: (model) => {
            cube.userData.detail = model;

            // The visitor may have gone back while this was downloading
            if (viewState !== 'detail' || selectedCube !== cube) {
                model.visible = false;
                return;
            }

            setProjectStatus(null);

            // The model is a child of the cube, so framing the cube frames
            // both together
            frameDetail(cube);
        },
    });
}

function closeProject() {
    if (viewState !== 'detail') return;

    const cube = selectedCube;

    viewState = 'catalog';
    selectedCube = null;

    hideProject();
    setProjectStatus(null);
    controls.autoRotate = false;

    if (cube && cube.userData.detail) cube.userData.detail.visible = false;

    // Bring the catalog back
    cubes.forEach((other) => {
        other.material.depthWrite = true;

        gsap.to(other.material, { opacity: 1, duration: 0.7, ease: 'power2.out' });
        gsap.to(other.userData.edges.material, { opacity: 1, duration: 0.7, ease: 'power2.out' });

        other.material.color.set(cubesColor);
        other.userData.edges.material.color.set(selectedCubeColor);
        other.visible = true;

        if (other.userData.content) other.userData.content.visible = true;
    });

    exitDetailProjection(1.1);
    fitCameraToGrid({ animate: true });
}

// Add event listener for mouse move
window.addEventListener('mousemove', onMouseMove);

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




