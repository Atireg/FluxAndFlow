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
        year: '',
        role: '',
        context: '',
        body: [],
        credits: '',

        thumbModel: 'models/rock.gltf',
        detailModel: 'models/RockPrintStructureReduced.glb',
    },
];

/**
 * How much of the viewport the project panel covers, per layout. These mirror
 * --panel-fraction in styles.css and the 859px breakpoint there; the detail
 * camera frames the model into whatever space the panel leaves free.
 */
const PANEL_FRACTION = { side: 0.44, stacked: 0.54 };
const SIDE_PANEL_QUERY = '(min-width: 860px)';

function getPanelLayout() {
    const mode = window.matchMedia(SIDE_PANEL_QUERY).matches ? 'side' : 'stacked';

    return { mode, fraction: PANEL_FRACTION[mode] };
}

const projectBySlot = new Map(projects.map((project) => [project.slot, project]));

/**
 * Project panel (the 2D half of the detail view)
 */
const panel = document.querySelector('#panel');
const panelTitle = document.querySelector('#panel-title');
const panelMeta = document.querySelector('#panel-meta');
const panelBody = document.querySelector('#panel-body');
const panelCredits = document.querySelector('#panel-credits');
const panelStatus = document.querySelector('#panel-status');
const panelClose = document.querySelector('#panel-close');

function showPanel(project) {
    panelTitle.textContent = project.title;

    // Only render the meta rows a project actually has
    panelMeta.replaceChildren();
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
        panelMeta.append(dt, dd);
    });

    panelBody.replaceChildren(
        ...(project.body ?? []).map((text) => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            return paragraph;
        })
    );

    panelCredits.textContent = project.credits ?? '';
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
}

function hidePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    panel.scrollTop = 0;
}

function setPanelStatus(message) {
    panelStatus.textContent = message ?? '';
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
                        uPointSize: { value: 20 * renderer.getPixelRatio() }
                    },
                });

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
 * Camera
 */
const camera = new THREE.PerspectiveCamera(45, screenWidth / screenHeight, 1, 2000);
scene.add(camera);

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
 */
scene.fog = new THREE.Fog('#04343f', 15, 8)

/**
 * Playground
 */
let cubes = [];
let gridShape = { cols: 1, rows: SLOT_COUNT };
let viewState = 'catalog'; // 'catalog' | 'detail'
let selectedCube = null; // the cube whose project is open, in detail view
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

        // Add random Y offset and speed for animation
        cube.userData.ySpeed = Math.random() * 0.01 + 0.001; // Speed of Y movement
        cube.userData.yOffset = Math.random() * 5 - 2.5; // Initial random Y offset
        cube.position.y = cube.userData.yOffset;

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

    const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const distanceForDepth = (gridDepth * margin) / 2 / Math.tan(halfFov);
    const distanceForWidth = (gridWidth * margin) / 2 / (Math.tan(halfFov) * camera.aspect);

    // Clear the highest point a cube reaches while it bobs
    const cubeTop = cubeSize / 2 + 3;
    const height = Math.max(distanceForDepth, distanceForWidth) + cubeTop;

    // Position the camera above the grid, looking straight down at its centre
    camera.up.set(0, 1, 0);
    camera.updateProjectionMatrix();

    if (animate) {
        gsap.to(camera.position, { x: 0, y: height, z: 0, duration: 1.1, ease: 'power2.inOut' });
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.1, ease: 'power2.inOut' });
        return;
    }

    camera.position.set(0, height, 0);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

/**
 * Frame an object for the detail view, in the part of the viewport the
 * project panel leaves free. Uses the object's bounding sphere, so it fits
 * whatever shape a project's model happens to be.
 */
function frameDetail(object, { duration = 1.6 } = {}) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const { mode, fraction } = getPanelLayout();
    const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const radius = sphere.radius * 1.15;
    const free = 1 - fraction;

    // Distance at which the model fits both axes of the free area
    const forHeight = radius / Math.tan(halfFov) / (mode === 'stacked' ? free : 1);
    const forWidth = radius / (Math.tan(halfFov) * camera.aspect) / (mode === 'side' ? free : 1);
    const distance = Math.max(forHeight, forWidth);

    // Look at the model from the side, a little above and in front
    const direction = new THREE.Vector3(-1, 0.3, 0.55).normalize();
    const position = sphere.center.clone().addScaledVector(direction, distance);

    // Slide the whole view sideways (or up) so the model sits in the free
    // half rather than behind the panel
    const forward = sphere.center.clone().sub(position).normalize();
    const right = forward.clone().cross(camera.up).normalize();
    const visibleHeight = 2 * distance * Math.tan(halfFov);
    const shift = (fraction / 2) * (mode === 'side' ? visibleHeight * camera.aspect : visibleHeight);
    const offset = mode === 'side'
        ? right.multiplyScalar(shift)
        : right.cross(forward).normalize().multiplyScalar(-shift);

    position.add(offset);
    const target = sphere.center.clone().add(offset);

    gsap.to(camera.position, { x: position.x, y: position.y, z: position.z, duration, ease: 'power2.inOut' });
    gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration, ease: 'power2.inOut' });
}

window.addEventListener('resize', () => {
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;
    aspectRatio = screenWidth / screenHeight;

    // Update camera
    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();

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

    // The panel changes size and may switch sides, so re-frame the model
    const detail = selectedCube && (selectedCube.userData.detail ?? selectedCube);
    if (detail) frameDetail(detail, { duration: 0.4 });
});

const clock = new THREE.Clock();

// Animate the cubes' Y positions
function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Update smoke
    smokeMaterial.uniforms.uTime.value = elapsedTime;

    cubes.forEach((cube) => {
        // Move the cube along the Y-axis
        cube.position.y += cube.userData.ySpeed;

        // Reverse direction if the cube goes out of bounds
        if (cube.position.y > 3 || cube.position.y < -3) {
            cube.userData.ySpeed *= -1;
        }
    });

    // Update controls
    controls.update();

    // Render the scene
    renderer.render(scene, camera);
}
animate();

// Variables to store hovered cube and animation state
let hoveredCube = null;
let fluxyAnimationId = null;

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

    if (cube) {
        if (hoveredCube !== cube) {
            // If a new cube is hovered, stop the old animation and start a new one
            if (hoveredCube) stopFluxyMovement(hoveredCube);
            hoveredCube = cube;
            startFluxyMovement(hoveredCube);
        }
    } else {
        // If no cube is hovered, stop any ongoing animation
        if (hoveredCube) stopFluxyMovement(hoveredCube);
        hoveredCube = null;
    }
}

// Function to start fluxy movement on a cube
function startFluxyMovement(cube) {
    let time = 0;

    const animateFluxy = () => {
        time += 0.3; // Adjust speed of the animation
        cube.position.x += Math.sin(time) * 0.02; // Add fluxy movement
        cube.position.y += Math.sin(time) * 0.02; // Add fluxy movement
        if (cube.userData.content) {
            cube.userData.content.scale.setScalar(1 + Math.sin(time * 0.05) * 0.1);
        }
        cube.scale.setScalar(1 + Math.sin(time) * 0.2); // Optional: Add scaling effect

        cube.material.color.set(selectedCubeColor);
        cube.material.opacity = 0.4;

        // Change the edges color
        // if (cube.userData.content) {
        //     // cube.userData.edges.material.color.set(selectedCubeColor); // Fixed edge color
        //     cube.userData.content.scale.setScalar(1 + Math.sin(time * 0.05) * 0.05); // Fixed edge color

        // }

        fluxyAnimationId = requestAnimationFrame(animateFluxy);
    };

    animateFluxy();
}

// Function to stop fluxy movement on a cube
function stopFluxyMovement(cube) {
    if (fluxyAnimationId) {
        cancelAnimationFrame(fluxyAnimationId);
        fluxyAnimationId = null;
    }

    // Put the cube back in its slot - the hover nudges x/y as it animates,
    // and those nudges would otherwise accumulate and drift it away
    if (cube.userData.slotPosition) {
        cube.position.x = cube.userData.slotPosition.x;
        cube.position.z = cube.userData.slotPosition.z;
    }

    cube.scale.setScalar(1); // Reset scale
    cube.material.color.set(backgroudCubesColor);

    if (cube.userData.edges) {
        cube.userData.edges.material.color.set(backgroudCubesColor); // Fixed edge color
    }

    // Reset the child plane's rotation
    if (cube.userData.content) {
        // cube.userData.content.rotation.set(-Math.PI / 2, 0, 0); // Reset rotation
        cube.userData.content.scale.setScalar(0.15); // Reset scale
    }
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

    stopFluxyMovement(cube);

    // Hold the catalog still and sink it into the background, so the project
    // is the only thing competing for attention
    cubes.forEach((other) => {
        other.userData.restingYSpeed = other.userData.ySpeed;
        other.userData.ySpeed = 0;

        gsap.to(other.material, { opacity: 0, duration: 0.8, ease: 'power2.out' });
        gsap.to(other.userData.edges.material, {
            opacity: other === cube ? 0.3 : 0.05,
            duration: 0.8,
            ease: 'power2.out',
        });

        if (other.userData.content) other.userData.content.visible = false;
    });

    cube.userData.edges.material.color.set(selectedCubeColor);

    // Show the text straight away - it costs nothing and gives the click an
    // answer while the model is still downloading
    showPanel(project);

    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;

    if (cube.userData.detail) {
        cube.userData.detail.visible = true;
        setPanelStatus(null);
        frameDetail(cube.userData.detail);
        return;
    }

    // Move towards the cube now, then settle on the model once it arrives
    setPanelStatus('Loading model');
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

            setPanelStatus(null);
            frameDetail(model);
        },
    });
}

function closeProject() {
    if (viewState !== 'detail') return;

    const cube = selectedCube;

    viewState = 'catalog';
    selectedCube = null;

    hidePanel();
    setPanelStatus(null);
    controls.autoRotate = false;

    if (cube && cube.userData.detail) cube.userData.detail.visible = false;

    // Bring the catalog back
    cubes.forEach((other) => {
        other.userData.ySpeed = other.userData.restingYSpeed ?? other.userData.ySpeed;

        gsap.to(other.material, { opacity: 1, duration: 0.7, ease: 'power2.out' });
        gsap.to(other.userData.edges.material, { opacity: 1, duration: 0.7, ease: 'power2.out' });

        other.material.color.set(cubesColor);
        other.userData.edges.material.color.set(selectedCubeColor);
        other.visible = true;

        if (other.userData.content) other.userData.content.visible = true;
    });

    fitCameraToGrid({ animate: true });
}

// Add event listener for mouse move
window.addEventListener('mousemove', onMouseMove);

// Add the click event listener
window.addEventListener('click', onMouseClick);

// Ways back to the catalog
panelClose.addEventListener('click', (event) => {
    // Keep this click from reaching onMouseClick on the way up
    event.stopPropagation();
    closeProject();
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeProject();
});




