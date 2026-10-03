import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import GUI from 'lil-gui'
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { Sky } from 'three/addons/objects/Sky.js'

import gridVertexShader from './shaders/grid/vertex.glsl';
import gridFragmentShader from './shaders/grid/fragment.glsl';

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
        thumbModel: 'models/rock.gltf',
        detailModel: 'models/RockPrintStructureReduced.glb',
    },
];

const projectBySlot = new Map(projects.map((project) => [project.slot, project]));

/**
 * Loaders
 */
const textureLoader = new THREE.TextureLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(assetUrl('draco/'));

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

function addDetailsButton({parentObject}){

    console.log(parentObject);
    
    // Create a button geometry
    const buttonGeometry = new THREE.PlaneGeometry(10, 10, 8, 8);

    const buttonMaterial = new THREE.ShaderMaterial({
        vertexShader: gridVertexShader,
        fragmentShader: gridFragmentShader,
        side: THREE.DoubleSide,
    })
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    
    // Position the content at the center of the cube
    button.position.set(0, 0, 0);

    // Add the content as a child of the cube
    // parentObject.add(button);
    // parentObject.userData.button = button;
}

function loadPointCloudWithShaderMaterial({
    glbPath,
    parentObject,
    pointColor = 0xff0000, // Default point color (red)
    pointSize = 4.0, // Default point size
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
    });
}

// Move the camera back far enough to frame the whole grid
function fitCameraToGrid() {
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
    camera.position.set(0, height, 0);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();
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
    }
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

    // Reset the cube's position and scale
    cube.position.y = 0; // Reset to the original position (adjust if needed)
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

// Function to handle mouse clicks
function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersections with cubes
    const intersects = raycaster.intersectObjects(cubes);

    if (intersects.length === 0) return;

    // Get the cube that was clicked, and the project sitting in its slot
    const selectedCube = findCube(intersects[0].object);
    const project = selectedCube && selectedCube.userData.project;

    // Empty slots have nothing to open yet
    if (!project) return;

    stopFluxyMovement(selectedCube);
    // selectedCube.material.color.set(selectedCubeColor);
    selectedCube.userData.edges.material.color.set(selectedCubeColor);
    selectedCube.material.opacity = 0;

    if (selectedCube.userData.content) {
        selectedCube.userData.content.visible = false;
    }

    viewState = 'detail';

    zoomCameraToPlane(selectedCube);

    loadPointCloudWithShaderMaterial({
        glbPath: assetUrl(project.detailModel),
        parentObject: selectedCube,
        pointColor: 0x00ff00,
        pointSize: 5.0, // Larger point size
    });
}

// Function to zoom the camera to the plane
function zoomCameraToPlane(selectedCube) {
    // Get cube position
    const targetPosition = new THREE.Vector3();
    selectedCube.getWorldPosition(targetPosition);

    // Calculate camera position for side view
    const distance = 10; // Distance from cube
    const finalCameraPosition = new THREE.Vector3(
        targetPosition.x - distance, // Position camera to the left of cube
        targetPosition.y,
        targetPosition.z           // Same Z as cube
    );

    // Point camera at cube
    const lookAtPosition = targetPosition.clone();

    // Hide cubes between camera and selected cube
    cubes.forEach((cube) => {
        if (cube !== selectedCube) {
            const cubePosition = new THREE.Vector3();
            cube.getWorldPosition(cubePosition);

            // Calculate if cube is between camera and target
            const cameraToCube = cubePosition.clone().sub(finalCameraPosition);
            const cameraToTarget = targetPosition.clone().sub(finalCameraPosition);

            const distanceToCube = cameraToCube.length();
            const distanceToTarget = cameraToTarget.length();

            cube.visible = distanceToCube > distanceToTarget;

            cube.material.color.set(backgroudCubesColor);
            cube.material.opacity = 0.4;

            cube.userData.edges.material.color.set(backgroudCubesColor);
            cube.userData.edges.material.opacity = 0.8;

            if (cube.userData.content) {
                cube.userData.content.scale.setScalar(0.15);
            }
        }
    });

    // Stop cube movement
    selectedCube.userData.ySpeed = 0;
    selectedCube.userData.yOffset = 0;

    // Disable hover and click behaviors
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('click', onMouseClick);

    // Animate camera
    gsap.to(camera.position, {
        x: finalCameraPosition.x,
        y: finalCameraPosition.y,
        z: finalCameraPosition.z + 5,
        duration: 2,
        delay: 0.3,
        ease: "power1.inOut",
        onUpdate: () => {
            camera.lookAt(lookAtPosition);
        }
    });

    controls.autoRotateSpeed = 0.3;
    controls.autoRotate = true;

    // console.log(selectedCube.userData.content);
    

    addDetailsButton({ parentObject: selectedCube });

}

// Add event listener for mouse move
window.addEventListener('mousemove', onMouseMove);

// Add the click event listener
window.addEventListener('click', onMouseClick);




