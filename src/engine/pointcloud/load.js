import * as THREE from 'three';
import { gltfLoader } from '../assets.js';
import { MESH_FIT_SIZE } from '../constants.js';
import { POINT_INKS, POINT_SIZES, pointInkUniforms, screenColor, SPOTLIGHT_GLOW_COLOR, THUMB_INK_COLOR } from '../colors.js';
import { createPile, findRods } from '../pile.js';
import { addGatherAttributes, GATHER_DURATION, GATHER_SPREAD, GATHER_SWIRL, GATHER_TRAIL, GATHER_TRAIL_EVERY } from './gather.js';
import { addTrails } from './trails.js';
import { CLIP_NONE, makeCutCounter, makeCutFill, makeEdgeMaterial, makeInkMaterial, pointsFromMeshes } from './mesh.js';
import { addScreenPanel, addScreenVideo } from './screenVideo.js';
import { smooth01 } from '../ease.js';

import gatherGlsl from '../shaders/pointCloud/gather.glsl';
import pointCloudVertexShader from '../shaders/pointCloud/vertex.glsl';
import pointCloudFragmentShader from '../shaders/pointCloud/fragment.glsl';

import trailCornerGlsl from '../shaders/trail/corner.glsl';
import trailGatherVertexShader from '../shaders/trail/gatherVertex.glsl';
import trailGatherFragmentShader from '../shaders/trail/gatherFragment.glsl';
import inkGlsl from '../shaders/pointCloud/ink.glsl';

// Degrees between two faces for their shared edge to be outlined (a part's `edges`)
const EDGE_ANGLE = 25;

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
    floor,
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
                const edgeMaterial = makeEdgeMaterial(screenColor(92, 92, 94), { fade, clip }); // dark grey
                pieces.forEach(({ material: lookName, part, edges, geometry }) => {
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
                    // A part's outline in thin black (a glass sheet's upper ply),
                    // where its faces meet at more than EDGE_ANGLE
                    if (edges) {
                        const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, EDGE_ANGLE), edgeMaterial);
                        outline.raycast = () => {};
                        outline.renderOrder = 2; // over the see-through parts
                        group.add(outline);
                    }
                    group.userData.solidMaterial ??= material;
                });
                if (section) addSection(group, { clip, fade });
                if (floor) addFloor(group, fade);
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

const SECTION_PLANE_PAD = 0.3; // the outline's reach past the model, a share of its size
const SECTION_PLANE_OPACITY = 0.5;
const SECTION_PLANE_HOLD = 0.6; // seconds it stays after the visitor lets go...
const SECTION_PLANE_FADE = 0.8; // ...and fades over

/**
 * A model's section (`section`): its parts cut away beyond a plane across
 * its length (z, its own space), moved by the visitor (setSection, engine),
 * a thin outline of the plane, wider and higher than the model, shown only
 * while the visitor handles the model or the slider (fadeSectionOutline),
 * each part's own cut edges traced in black - the joints read as in a
 * drawing - and the parts' cut faces filled in orange (makeCutFill)
 */
function addSection(group, { clip, fade }) {
    const box = new THREE.Box3();
    const meshes = group.children.filter((child) => child.isMesh);
    meshes.forEach((mesh) => {
        mesh.geometry.computeBoundingBox();
        box.union(mesh.geometry.boundingBox);
    });
    if (box.isEmpty()) return;

    // The cut edges, worked out again whenever the section moves
    const cut = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        // black, like a section drawing
        new THREE.LineBasicMaterial({ color: screenColor(18, 18, 20) }),
    );
    cut.frustumCulled = false;
    cut.raycast = () => {};
    cut.visible = false;
    cut.renderOrder = 2; // over the see-through parts
    group.add(cut);

    // From the floor up, past the model's sides and top
    const { min, max } = box;
    const pad = SECTION_PLANE_PAD * Math.max(max.x - min.x, max.y - min.y);
    const outline = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(min.x - pad, min.y, 0), new THREE.Vector3(max.x + pad, min.y, 0),
            new THREE.Vector3(max.x + pad, max.y + pad, 0), new THREE.Vector3(min.x - pad, max.y + pad, 0),
        ]),
        new THREE.LineBasicMaterial({ color: THUMB_INK_COLOR, transparent: true, opacity: 0 }),
    );
    outline.visible = false;
    outline.raycast = () => {}; // never something to hover
    group.add(outline);

    // The cut faces: each part counted into the stencil, then the plane
    // filled where it cuts one
    const counters = [THREE.BackSide, THREE.FrontSide].map((side) => makeCutCounter(clip, side));
    meshes.forEach((mesh) => counters.forEach((material) => {
        const counter = new THREE.Mesh(mesh.geometry, material);
        counter.position.copy(mesh.position);
        counter.quaternion.copy(mesh.quaternion);
        counter.scale.copy(mesh.scale);
        counter.raycast = () => {};
        counter.frustumCulled = false;
        counter.renderOrder = 1;
        group.add(counter);
    }));
    const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(max.x - min.x + 2 * pad, max.y - min.y + pad),
        makeCutFill(SPOTLIGHT_GLOW_COLOR, { fade }),
    );
    fill.geometry.translate((min.x + max.x) / 2, min.y + (max.y - min.y + pad) / 2, 0);
    fill.visible = false;
    fill.raycast = () => {};
    fill.renderOrder = 1.5; // after the count, before the cut's black lines
    group.add(fill);

    group.userData.section = { clip, outline, fill, cut, meshes, from: min.z, to: max.z };
}

// Each triangle the plane z passes through gives one segment of the cut
export function traceCut(meshes, z) {
    const points = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const crossing = (p, q) => new THREE.Vector3().lerpVectors(p, q, (z - p.z) / (q.z - p.z));
    meshes.forEach(({ geometry }) => {
        const { min, max } = geometry.boundingBox;
        if (z < min.z || z > max.z) return;
        const position = geometry.attributes.position;
        const index = geometry.index;
        const count = index ? index.count : position.count;
        for (let i = 0; i < count; i += 3) {
            a.fromBufferAttribute(position, index ? index.getX(i) : i);
            b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1);
            c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2);
            const ends = [];
            if ((a.z - z) * (b.z - z) < 0) ends.push(crossing(a, b));
            if ((b.z - z) * (c.z - z) < 0) ends.push(crossing(b, c));
            if ((c.z - z) * (a.z - z) < 0) ends.push(crossing(c, a));
            if (ends.length === 2) points.push(ends[0], ends[1]);
        }
    });
    return points;
}

// Cut a model at `share` of its length (0..1; 1, or more, cuts nothing),
// from its far end (z's top) back - the part kept is the one beyond the cut
export function setSection(model, share) {
    const section = model?.userData.section;
    if (!section) return;
    const z = section.to - (section.to - section.from) * Math.min(Math.max(share, 0), 1);
    section.clip.value = share >= 1 ? CLIP_NONE : z;
    section.outline.position.z = z;
    section.fill.position.z = z;
    section.fill.visible = share < 1;
    section.cut.visible = share < 1;
    if (share < 1) {
        section.cut.geometry.dispose();
        section.cut.geometry = new THREE.BufferGeometry().setFromPoints(traceCut(section.meshes, z));
    }
}

/**
 * The section's outline, `idle` seconds after the visitor last touched the
 * model or the slider: there while they do, fading out after - only where
 * it cuts
 */
export function fadeSectionOutline(model, idle) {
    const section = model?.userData.section;
    if (!section) return;
    const shown = 1 - smooth01((idle - SECTION_PLANE_HOLD) / SECTION_PLANE_FADE);
    section.outline.material.opacity = SECTION_PLANE_OPACITY * shown;
    section.outline.visible = shown > 0 && section.clip.value !== CLIP_NONE;
}

/**
 * A floor under a solid model (`floor`), so a figure beside it stands on
 * something: a disc a little wider than the model, at the model's foot (the
 * foundations' underside), the figure set down onto it, a shade darker than the paper and fading out into it at
 * its edge - ground, not a slab. Fades in with the model.
 */
function addFloor(group, fade) {
    const box = new THREE.Box3();
    group.children.forEach((child) => {
        if (!child.isMesh) return;
        child.geometry.computeBoundingBox();
        box.union(child.geometry.boundingBox);
    });
    if (box.isEmpty()) return;

    // At the foot of the foundations - the figure set down onto it, standing
    // there rather than on the floor the model left out (asked for)
    const level = box.min.y;
    const figure = group.userData.figure;
    if (figure) {
        figure.computeBoundingBox();
        figure.translate(0, level - figure.boundingBox.min.y, 0);
        figure.computeBoundingBox();
    }
    const size = box.getSize(new THREE.Vector3());
    const radius = 0.75 * Math.max(size.x, size.z);

    const centre = box.getCenter(new THREE.Vector3());
    group.add(softDisc(radius, screenColor(222, 218, 210), 1, centre.x, level, centre.z, fade));

    // ...and a faint shadow under the figure's feet, where it touches it
    if (figure) {
        const feet = figure.boundingBox;
        const footprint = feet.getSize(new THREE.Vector3());
        const at = feet.getCenter(new THREE.Vector3());
        group.add(softDisc(0.6 * Math.max(footprint.x, footprint.z), screenColor(150, 146, 140), 0.45, at.x, level + 0.001, at.z, fade));
    }
}

// A disc on the ground, `ink` at its middle fading out to nothing at its edge
function softDisc(radius, ink, strength, x, y, z, fade) {
    const disc = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 64).rotateX(-Math.PI / 2),
        new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uInk: { value: ink },
                uStrength: { value: strength },
                uRadius: { value: radius },
                uFade: fade,
            },
            vertexShader: `
varying vec2 vAt;
void main() {
    vAt = position.xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
            fragmentShader: `
uniform vec3 uInk;
uniform float uStrength;
uniform float uRadius;
uniform float uFade;
varying vec2 vAt;
void main() {
    float r = length(vAt) / uRadius;
    gl_FragColor = vec4(uInk, uStrength * (1.0 - smoothstep(0.45, 1.0, r)) * (1.0 - uFade));
}`,
        }),
    );
    disc.position.set(x, y, z);
    disc.renderOrder = -1; // under everything on it
    disc.raycast = () => {}; // never something to hover
    return disc;
}
