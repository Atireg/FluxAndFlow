import * as THREE from 'three';
import { assetUrl, gltfLoader } from './assets.js';
import { CUBE_SIZE, PEBBLE_SIZE_MAX, PEBBLE_SIZE_MIN, SPACING } from './constants.js';
import { THUMB_INK_COLOR } from './colors.js';
import { makePebbleMaterials, paintGlow } from './pebbles/materials.js';
import { makePebbleGeometry } from './pebbles/geometry.js';
import { createWander, placeAtRest } from './pebbles/wander.js';
import { poseSpotlightPebble } from './pebbles/spotlight.js';

/**
 * A project's own thumbnail (`thumbSize`) is drawn in the rock's ink - its
 * colour on screen - whatever the file's own material, so the grid reads as
 * one set.
 */
const THUMB_INK = new THREE.MeshBasicMaterial({ color: THUMB_INK_COLOR });

/**
 * The catalog: a fixed grid of pebbles, one per slot.
 *
 * The count is fixed whatever the viewport, so a project always has a home
 * and none is ever unreachable; the viewport only decides how they are
 * arranged. Pebbles are never rebuilt on a resize - a project keeps its slot
 * and anything already loaded stays loaded.
 */
export function createCatalog({ scene, grid, state, boot, visited, source }) {
    /**
     * One download per file, however many pebbles show it: each pebble gets
     * its own clone of the loaded scene (geometry and materials shared).
     * Under ?cloudtest each copy has its own URL, so there it's still ten
     * downloads.
     */
    const thumbScenes = new Map();

    function loadThumb(path) {
        if (!thumbScenes.has(path)) {
            const asset = boot.asset();

            thumbScenes.set(path, new Promise((resolve) => {
                gltfLoader.load(
                    assetUrl(path),
                    (gltf) => { asset.done(); resolve(gltf.scene); },
                    asset.progress,
                    () => { asset.done(); resolve(null); },
                );
            }));
        }

        return thumbScenes.get(path);
    }

    // A project's thumbnail, or the rock for a slot with nothing in it yet
    function addContentToPebble(pebble) {
        const path = pebble.userData.project?.thumbModel ?? source.emptyThumb;

        loadThumb(path).then((scene) => {
            if (!scene) return;

            const size = pebble.userData.project?.thumbSize;
            let content;

            if (size) {
                // Any model, in whatever units it was drawn: centred, its
                // longest side `thumbSize`, in the rock's ink
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
                pebble.userData.contentBaseScale = pebble.userData.size;
            } else {
                // The rock, as drawn
                content = scene.clone();
                content.traverse((child) => { if (child.isMesh) child.material = THUMB_INK; });
                content.position.set(0, -pebble.userData.size, 0);
                pebble.userData.contentBaseScale = 0.2 * pebble.userData.size;
            }

            content.scale.setScalar(pebble.userData.contentBaseScale);
            pebble.add(content);
            pebble.userData.content = content;

            // A project already open hides every pebble's thumbnail; one that
            // arrives late must not pop back in
            if (state.view === 'detail') content.visible = false;
        });
    }

    /**
     * Pick the arrangement whose proportions sit closest to the viewport's,
     * so a wide window gets a wide grid and a tall one gets a tall grid -
     * without ever changing how many pebbles there are.
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

    const catalog = {
        /**
         * Build the grid. One pebble per slot, each its own shape and a
         * random size on every visit.
         */
        build(aspect) {
            grid.pebbles.forEach((pebble) => scene.remove(pebble));
            grid.pebbles.length = 0;

            for (let slot = 0; slot < source.slotCount; slot++) {
                const seed = slot * 2.37 + 1.1;
                // Its size goes into the geometry, not the mesh's scale: the
                // mesh also carries the project's model once it opens, which
                // must not grow
                const size = THREE.MathUtils.randFloat(PEBBLE_SIZE_MIN, PEBBLE_SIZE_MAX);
                const geometry = makePebbleGeometry(seed, size);
                const { face, rim } = makePebbleMaterials(seed, size);

                const pebble = new THREE.Mesh(geometry, face);

                // The pebble's rim, in place of a box's edge lines. It fluxes
                // with the face, on the same seed, so it stays on it.
                const edges = new THREE.Mesh(geometry, rim);
                edges.renderOrder = 1;
                pebble.add(edges);
                pebble.userData.edges = edges;
                pebble.userData.fluxSeed = seed;
                pebble.userData.size = size;

                // Which slot this is, and the project sitting in it (null when empty)
                pebble.userData.slot = slot;
                pebble.userData.project = source.projectBySlot.get(slot) ?? null;
                pebble.userData.visited = visited.has(pebble.userData.project?.id);
                // What hangs under it when it glows - the project's name, or
                // the slot's number. Read once here, so the per-frame tag
                // update never touches a project.
                pebble.userData.label = source.label({ project: pebble.userData.project, slot });

                // How this pebble drifts while idle - see wanderOffset(). Its
                // position is set every frame from this plus the slot, once
                // layout() has given it a slot to drift around.
                pebble.userData.wander = createWander();

                scene.add(pebble);
                grid.pebbles.push(pebble);

                addContentToPebble(pebble);
            }

            catalog.layout(aspect);
        },

        // Position the pebbles in the arrangement this viewport calls for
        layout(aspect) {
            grid.shape = computeGridShape(grid.pebbles.length, aspect);

            const step = CUBE_SIZE * SPACING;
            const offsetZ = ((grid.shape.rows - 1) * step) / 2;

            grid.pebbles.forEach((pebble, index) => {
                const row = Math.floor(index / grid.shape.cols);
                const col = index % grid.shape.cols;

                // Centre each row, so a partly filled last row still looks
                // deliberate
                const inRow = Math.min(grid.shape.cols, grid.pebbles.length - row * grid.shape.cols);
                const offsetX = ((inRow - 1) * step) / 2;

                pebble.position.x = col * step - offsetX;
                pebble.position.z = row * step - offsetZ;

                // The flow nudges pebbles around, so keep a home to return to
                pebble.userData.slotPosition = { x: pebble.position.x, z: pebble.position.z };
            });
        },

        /**
         * One pebble's full visual state - position, rotation, scale, colour,
         * opacity - is a pure function of its current mode and the clock,
         * recomputed from scratch every frame. There is no separate animation
         * loop to start or stop and nothing is ever incremented, so nothing
         * can drift and nothing needs to be reset by hand when a mode ends:
         * the next frame simply computes a different mode's state instead.
         *
         * A GSAP tween on a property this also writes is silently
         * overwritten - add a mode, or keep this out of that window.
         */
        updatePebble(pebble, elapsedTime) {
            if (pebble === state.spotlight.pebble) {
                poseSpotlightPebble(pebble, state, elapsedTime);
            } else {
                catalog.updateIdlePebble(pebble, elapsedTime);
            }
        },

        // Floating, as it rests. Hover changes nothing: the pebble under the
        // pointer stays as it is, to be clicked
        updateIdlePebble(pebble, elapsedTime) {
            placeAtRest(pebble, elapsedTime);
            paintGlow(pebble, 0);

            if (pebble.userData.content) {
                pebble.userData.content.scale.setScalar(pebble.userData.contentBaseScale);
            }
        },
    };

    return catalog;
}

/**
 * A ray can land on a pebble's rim or on the model inside it, so walk back up
 * the hierarchy to the pebble that owns whatever was hit.
 */
export function findPebble(object) {
    let current = object;

    while (current) {
        if (current.userData.slot !== undefined) return current;
        current = current.parent;
    }

    return null;
}
