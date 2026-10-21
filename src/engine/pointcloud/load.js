import * as THREE from 'three';
import { gltfLoader } from '../assets.js';
import { MESH_FIT_SIZE } from '../constants.js';
import { POINT_INKS, POINT_SIZES, pointInkUniforms, THUMB_INK_COLOR } from '../colors.js';
import { createPile, findRods } from '../pile.js';
import { addGatherAttributes, GATHER_DURATION, GATHER_SPREAD, GATHER_SWIRL, GATHER_TRAIL, GATHER_TRAIL_EVERY } from './gather.js';
import { addTrails } from './trails.js';
import { CLIP_NONE, makeInkMaterial, pointsFromMeshes } from './mesh.js';
import { addScreenPanel, addScreenVideo } from './screenVideo.js';

import gatherGlsl from '../shaders/pointCloud/gather.glsl';
import pointCloudVertexShader from '../shaders/pointCloud/vertex.glsl';
import pointCloudFragmentShader from '../shaders/pointCloud/fragment.glsl';

import trailCornerGlsl from '../shaders/trail/corner.glsl';
import trailGatherVertexShader from '../shaders/trail/gatherVertex.glsl';
import trailGatherFragmentShader from '../shaders/trail/gatherFragment.glsl';
import inkGlsl from '../shaders/pointCloud/ink.glsl';

/**
 * Load a project's detail model as a cloud of points.
 *
 * One path for every project, whatever it declared: a .glb that is already a
 * point cloud is drawn as it is; a plain mesh is sampled into points as it
 * loads (`points`), and a rod-built one can have copies dropped onto a
 * surface with physics (`drop`), or drawn as the mesh itself (`solid`). Which of those happens is read off the
 * project, so a new project needs no new code here - see src/projects/.
 */
export function loadPointCloud({
    url,
    parent,
    perlinTexture,
    registerPointMaterial,
    onLoaded,
    onProgress,
    onError,
    gather = false,
    points,
    drop,
    solid = false,
    parts,
    figure,
    section,
    screen,
    screenVideo,
}) {
    gltfLoader.load(url, async (gltf) => {
        const materials = [];
        const trails = [];

        let hasPoints = false;
        gltf.scene.traverse((child) => { if (child.isPoints) hasPoints = true; });
        if (!hasPoints) {
            const original = gltf.scene;
            const sampled = pointsFromMeshes(gltf.scene, points);
            if (!sampled) {
                onError?.(new Error('No points or meshes in the model'));
                return;
            }
            gltf.scene = sampled;

            // The mesh itself in the inks, no points (its reveal fades it in)
            if (solid) {
                const look = solid === true ? {} : solid;
                const group = new THREE.Group();
                // Each part in its own look (`parts`, by material name, the
                // rest in the project's), all fading in together on one
                // uniform - or the whole model merged in one. The `figure`
                // part isn't drawn: the pebble's points form it (dissolve.js)
                const fade = { value: 1 };
                // ...and cut on one uniform too (`section`, see addSection)
                const clip = { value: CLIP_NONE };
                const pieces = parts || figure
                    ? sampled.userData.parts
                    : [{ material: '', part: '', geometry: sampled.userData.solid }];
                pieces.forEach(({ material: lookName, part, geometry }) => {
                    if (lookName === figure) {
                        group.userData.figure = geometry;
                        return;
                    }
                    const material = makeInkMaterial(parts?.[lookName] ?? look);
                    material.uniforms.uFade = fade;
                    material.uniforms.uClip = clip;
                    const mesh = new THREE.Mesh(geometry, material);
                    // Its own name, for a project's `info` (see detail.js's hover)
                    mesh.name = part;
                    if (material.transparent) mesh.renderOrder = 1; // after the opaque parts
                    group.add(mesh);
                    group.userData.solidMaterial ??= material;
                });
                if (section) addSection(group, clip);
                // Where the pebble's points settle and circle (`screen`)
                if (screen) group.userData.screen = screenFrame(original, screen, sampled.userData.fit);
                // ...a white screen, with rounded corners
                if (group.userData.screen) addScreenPanel(group, group.userData.screen);
                // ...over a film playing on it (`screenVideo`)
                if (screenVideo && group.userData.screen) addScreenVideo(group, group.userData.screen, screenVideo);
                parent.add(group);
                onLoaded?.(group);
                return;
            }

            // Several copies dropped onto a surface with physics (../pile.js)
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
                        // Pulsing dots where they interlock, once at rest
                        contacts: Boolean(drop.contacts),
                        // Each aggregate's velocity, live, while it moves
                        velocity: Boolean(drop.velocity),
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
            // Points that bring their own look (a pile's interlocking dots)
            // aren't part of the cloud
            if (!child.isPoints || child.userData.ownMaterial) return;

            gltf.scene.userData.points ??= child;
            const geometry = child.geometry;
            if (gather) addGatherAttributes(geometry);
            const pointsCount = geometry.attributes.position.count;

            // Each point is given one of three sizes at random
            const scales = new Float32Array(pointsCount);
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

            const shaderMaterial = new THREE.ShaderMaterial({
                // Ink laid over the paper, not light added to a dark
                // ground - additive points vanish on a light background
                depthWrite: false,
                depthTest: false,
                transparent: true,
                vertexShader: gatherGlsl + pointCloudVertexShader,
                fragmentShader: inkGlsl + pointCloudFragmentShader,
                uniforms: {
                    ...pointInkUniforms(),
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

            materials.push(shaderMaterial);
            registerPointMaterial(shaderMaterial);

            child.material = shaderMaterial;

            if (gather) {
                trails.push(addTrails(child, {
                    vertexShader: gatherGlsl + trailCornerGlsl + trailGatherVertexShader,
                    fragmentShader: inkGlsl + trailGatherFragmentShader,
                    names: ['aScatter', 'aGatherDelay', 'aScale', 'aTone'],
                    lag: GATHER_TRAIL / GATHER_DURATION,
                    every: GATHER_TRAIL_EVERY,
                }));
            }
        });

        gltf.scene.userData.pointMaterials = materials;
        gltf.scene.userData.trails = trails;
        gltf.scene.userData.gathers = gather;

        parent.add(gltf.scene);

        onLoaded?.(gltf.scene);
    }, onProgress, onError);
}

const SCREEN_LIFT = 0.03; // how far in front of the screen its points circle, in fitted units

/**
 * A solid model's screen (`screen`, the name of one of its meshes, drawn in
 * its own space with X across, Y up and Z out towards the viewer), in the
 * fitted model's space: where its points circle (just in front of its face),
 * its face's middle, the way out of it, and the vectors to its right and
 * top edges.
 */
function screenFrame(root, name, { centre, factor }) {
    let mesh = null;
    root.getObjectByName(name)?.traverse((child) => { if (!mesh && child.isMesh) mesh = child; });
    if (!mesh) {
        console.error(`No mesh called "${name}" in the model for its screen`);
        return null;
    }

    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const local = box.getCenter(new THREE.Vector3());
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const fitted = (x, y, z) => new THREE.Vector3(local.x + x, local.y + y, local.z + z)
        .applyMatrix4(mesh.matrixWorld).sub(centre).multiplyScalar(factor);

    const middle = fitted(0, 0, 0);
    const out = fitted(0, 0, half.z).sub(middle);
    const face = middle.clone().add(out);
    out.normalize();
    return {
        centre: face.clone().addScaledVector(out, SCREEN_LIFT),
        face,
        out,
        u: fitted(half.x, 0, 0).sub(middle),
        v: fitted(0, half.y, 0).sub(middle),
    };
}

/**
 * A model's section (`section`): its parts cut away beyond a plane across
 * its length (z, its own space), moved by the visitor (setSection, engine),
 * and a thin outline of the model's breadth and height where it cuts
 */
function addSection(group, clip) {
    const box = new THREE.Box3();
    group.children.forEach((mesh) => {
        mesh.geometry.computeBoundingBox();
        box.union(mesh.geometry.boundingBox);
    });
    if (box.isEmpty()) return;

    const { min, max } = box;
    const outline = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(min.x, min.y, 0), new THREE.Vector3(max.x, min.y, 0),
            new THREE.Vector3(max.x, max.y, 0), new THREE.Vector3(min.x, max.y, 0),
        ]),
        new THREE.LineBasicMaterial({ color: THUMB_INK_COLOR, transparent: true, opacity: 0.5 }),
    );
    outline.visible = false;
    outline.raycast = () => {}; // never something to hover
    group.add(outline);
    group.userData.section = { clip, outline, from: min.z, to: max.z };
}

// Cut a model at `share` of its length (0..1; 1, or more, cuts nothing)
export function setSection(model, share) {
    const section = model?.userData.section;
    if (!section) return;
    const z = section.from + (section.to - section.from) * Math.min(Math.max(share, 0), 1);
    section.clip.value = share >= 1 ? CLIP_NONE : z;
    section.outline.position.z = z;
    section.outline.visible = share < 1;
}
