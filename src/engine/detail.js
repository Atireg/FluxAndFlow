import * as THREE from 'three';
import { gsap } from 'gsap';
import { assetUrl } from './assets.js';
import { getPanelLayout } from './layout.js';
import { loadPhysics, PILE_REPLAY_WAIT } from './pile.js';
import { loadPointCloud } from './pointcloud/load.js';
import { GATHER_DURATION } from './pointcloud/gather.js';
import { getDissolve } from './pebbles/dissolve.js';
import { armDrop, DROP_BOOM_HANG, DROP_OPEN_AFTER } from './pebbles/drop.js';
import { startArrival } from './pebbles/arrival.js';
import { restingFaceColor, restingRimColor } from './pebbles/materials.js';
import { modelStartYaw, modelTurn } from './camera/framing.js';

/**
 * Detail view: the project's model on the whole canvas, its description in a
 * drawer parked off the edge.
 *
 * Every project opens through the one path here. What differs between
 * projects - the camera angle, whether the points gather, whether copies are
 * dropped with physics, how many points a mesh is sampled into - is declared
 * on the project itself (see src/projects/) and read from it, so adding a
 * project needs no change in this file.
 */
const OPEN_CAMERA_EASE = 'power2.out';
const OPEN_CAMERA_DURATION_LOADING = 1; // seconds - the move in while the model is still downloading

// How long the grid takes to come back, closing. The camera is still parked
// against the pebble's own faces at the instant of closing, and
// fitToGrid's pull-back starts slow, so the reveal is held back until the
// camera has retreated clear of it. See DECISIONS.md.
const REVEAL_DELAY = 0.35;
const REVEAL_DURATION = 0.7;

/**
 * Double-click (or double-tap) on the model zooms in towards the spot under
 * the pointer; doing it again zooms back out to the view it came from. The
 * spot is the nearest point of the cloud along the pointer's ray, so it zooms
 * to what was actually tapped; if the tap missed the model, it zooms towards
 * the middle of the view instead. The viewing direction is kept, so it's a
 * straight move in, not a turn.
 */
const DETAIL_ZOOM = 0.4; // the camera ends up this fraction of its distance away
const DETAIL_ZOOM_DURATION = 0.9; // seconds

/**
 * Every few seconds, a touch point turns up over a random point of the open
 * model and taps twice - a hint that double-click/double-tap zooms in. First
 * once the points have gathered, then every TAP_HINT_GAP seconds, at a new
 * point each time; never while zoomed in, with the drawer open on a narrow
 * screen, or while the camera is moving.
 */
const TAP_HINT_AFTER_GATHER = 1.2; // seconds after the points have gathered before the first one
const TAP_HINT_GAP = 5; // seconds from one hint to the next

export function createDetail({
    state, grid, rig, framing, screen, clock, visited, perlinTexture, ui,
}) {
    const zoomRaycaster = new THREE.Raycaster();
    zoomRaycaster.params.Points.threshold = 0.06;

    const tapHintPoint = new THREE.Vector3();

    function markVisited(pebble) {
        pebble.userData.visited = true;
        visited.add(pebble.userData.project?.id);
    }

    const detail = {
        /**
         * The send-off after a project is clicked, then the camera's move in
         * partway through the fall - so the camera follows straight on from
         * it rather than waiting for it.
         */
        startDrop(pebble) {
            // A pile's physics engine starts downloading now, while the grid falls
            if (pebble.userData.project?.drop) loadPhysics();

            state.view = 'dropping';
            ui.resetFlow();
            state.droppingFrom = pebble;
            state.dropStartedAt = clock.getElapsedTime();
            // Square to the pebble again, however far a pile's ground turned
            // last time
            getDissolve(pebble).rotation.y = 0;
            state.hovered = null;

            armDrop(grid.pebbles, pebble);

            // The fall keeps playing out in detail view while openProject
            // fades the pebbles out
            gsap.delayedCall(DROP_BOOM_HANG + DROP_OPEN_AFTER, () => detail.openProject(pebble));
        },

        openProject(pebble) {
            const project = pebble.userData.project;

            state.view = 'detail';
            state.selected = pebble;
            state.hovered = null;

            /**
             * The pebble parents the detail model, so any residual spotlight
             * rock or jump would carry straight into the one-point elevation:
             * a tilt would skew edges that need to stay square to the canvas,
             * and a residual scale would render the model larger or smaller
             * than it actually is.
             */
            pebble.rotation.set(0, 0, 0);
            pebble.scale.setScalar(1);

            // Hold the catalog still and sink it into the background, so the
            // project is the only thing competing for attention
            grid.pebbles.forEach((other) => {
                // The faces fade to nothing but keep writing depth, which
                // hides the pebble's own back edges and flattens the
                // perspective away
                other.material.depthWrite = false;

                /**
                 * Only the project being looked at keeps its frame. Square-on,
                 * the rest of the grid lines up into a lattice of rectangles
                 * behind the model rather than scattering into the distance,
                 * so it goes entirely - the clicked pebble included: it has
                 * dissolved, and the project stands on its own in the fog.
                 */
                gsap.to(other.material, { opacity: 0, duration: 0.8, ease: 'power2.out' });
                gsap.to(other.userData.edges.material, { opacity: 0, duration: 0.8, ease: 'power2.out' });

                if (other.userData.content) other.userData.content.visible = false;
            });

            /**
             * The face fades out over the next 0.8s rather than vanishing
             * instantly, so a residual glow colour would otherwise show
             * through as a brief orange tint while it fades - reset both, for
             * the same reason rotation and scale are reset above.
             */
            markVisited(pebble);
            pebble.material.color.copy(restingFaceColor(pebble));
            pebble.material.emissive.setRGB(0, 0, 0);
            pebble.userData.edges.material.color.copy(restingRimColor(pebble));

            // Show the text straight away - it costs nothing and gives the
            // click an answer while the model is still downloading
            ui.onProjectOpen(project);

            // The elevation is the point of this view, so nothing rotates it
            // off-axis...
            rig.controls.autoRotate = false;
            // ...but the visitor may orbit it by hand
            rig.controls.enabled = true;

            // The grey fog rolls in behind the project as the camera moves in
            ui.onFog(true);

            // The first double-tap hint waits until the points have gathered
            state.tapHintNext = GATHER_DURATION + TAP_HINT_AFTER_GATHER;

            rig.enterDetailProjection();

            /**
             * This runs while the rest of the grid is still falling, which
             * already carries the motion - so the camera sets off at speed
             * and settles, rather than easing in from a standstill that reads
             * as a pause.
             */
            const ease = OPEN_CAMERA_EASE;

            if (pebble.userData.detail) {
                pebble.userData.detail.visible = true;
                pebble.userData.detail.rotation.y = modelStartYaw(project);
                pebble.userData.detail.userData.pile?.restart();
                pebble.userData.detail.userData.turnOffset = 0;
                pebble.userData.detailRotateStartTime = clock.getElapsedTime();
                ui.onStatus(null);
                framing.frameDetail(pebble, { ease });
                return;
            }

            // Frame the pebble now, then re-frame once the model is inside it
            ui.onStatus('Loading model');
            const openMoveEndsAt = clock.getElapsedTime() + OPEN_CAMERA_DURATION_LOADING;
            framing.frameDetail(pebble, { duration: OPEN_CAMERA_DURATION_LOADING, ease });

            loadPointCloud({
                url: assetUrl(project.detailModel),
                parent: pebble,
                perlinTexture,
                registerPointMaterial: rig.registerPointMaterial,
                gather: project.gather,
                points: project.points,
                drop: project.drop,
                // Say so rather than leave "Loading model" up forever, and
                // keep the real error for the browser's console
                onError: (error) => {
                    console.error('Could not load', project.detailModel, error);
                    if (state.selected === pebble) ui.onStatus('The model could not be loaded');
                },
                onLoaded: (model) => {
                    pebble.userData.detail = model;
                    model.rotation.y = modelStartYaw(project);

                    // The visitor may have gone back while this was downloading
                    if (state.view !== 'detail' || state.selected !== pebble) {
                        model.visible = false;
                        return;
                    }

                    ui.onStatus(null);
                    pebble.userData.detailRotateStartTime = clock.getElapsedTime();

                    /**
                     * The model is a child of the pebble, so framing the
                     * pebble frames both together. The drawer may already be
                     * open if it loaded slowly enough for the visitor to pull
                     * it out before this ran.
                     */
                    if (state.drawerOpen) {
                        framing.frameWithDrawerOpen(pebble);
                        return;
                    }

                    /**
                     * Loaded while the move in is still under way: carry on
                     * into the new frame within the time left, at speed,
                     * rather than restart from a standstill - which would
                     * stall the zoom halfway.
                     */
                    const remaining = openMoveEndsAt - clock.getElapsedTime();

                    if (remaining > 0) {
                        framing.frameDetail(pebble, { duration: Math.max(remaining, 0.4), ease });
                    } else {
                        framing.frameDetail(pebble);
                    }
                },
            });
        },

        closeProject() {
            if (state.view !== 'detail') return;

            const pebble = state.selected;
            state.selected = null;

            /**
             * Not 'catalog' yet. 'returning' places the pebbles back home each
             * frame, wherever the drop sent them, without touching the opacity
             * the reveal is fading in.
             *
             * Flipping straight to 'catalog' instead would have the very next
             * frame's catalog update call every pebble back to its resting
             * state - opacity included - as a plain assignment, since a
             * pebble's visual state is a pure function of its mode each frame,
             * not a diff against whatever a tween is mid-way through writing.
             * See DECISIONS.md.
             */
            state.view = 'returning';
            state.drawerOpen = false;

            ui.onProjectClose();
            ui.onStatus(null);
            rig.controls.autoRotate = false;
            rig.controls.enabled = false;
            ui.onFog(false);
            ui.hideTapHint();
            state.tapHintNext = Infinity;

            if (pebble?.userData.detail) pebble.userData.detail.visible = false;
            if (pebble?.userData.dissolve) pebble.userData.dissolve.visible = false;

            // Bring the catalog back: each pebble arrives in its own time, set
            // per frame by applyArrival (no opacity tween, for the reason above)
            startArrival(state, grid.pebbles, clock.getElapsedTime() + REVEAL_DELAY);
            grid.pebbles.forEach((other) => {
                gsap.delayedCall(REVEAL_DELAY, () => { other.material.depthWrite = true; });

                other.material.color.copy(restingFaceColor(other));
                other.material.emissive.setRGB(0, 0, 0);
                other.userData.edges.material.color.copy(restingRimColor(other));
                other.visible = true;

                if (other.userData.content) other.userData.content.visible = true;
            });

            gsap.delayedCall(REVEAL_DELAY + REVEAL_DURATION, () => { state.view = 'catalog'; });

            rig.exitDetailProjection(1.1);
            framing.fitToGrid({ animate: true });
        },

        /**
         * Drop the pile again, from the bar's "Drop again". The new drop
         * falls at the angle the model has reached rather than snapping back
         * to where it opened, and the turn picks up from there once it has
         * settled; the ground stays, and so does the camera.
         */
        replayDrop() {
            const model = state.selected?.userData.detail;
            const pile = model?.userData.pile;
            if (state.view !== 'detail' || !pile) return;

            const since = clock.getElapsedTime() - state.selected.userData.detailRotateStartTime;
            model.userData.turnOffset = modelTurn(model, since);
            pile.restart(PILE_REPLAY_WAIT);
        },

        toggleZoom(clientX, clientY) {
            if (state.view !== 'detail' || !state.selected) return;

            const { camera, controls } = rig;

            if (state.detailZoomed) {
                framing.reframe(state.selected, { duration: DETAIL_ZOOM_DURATION });
                return;
            }

            const pointer = new THREE.Vector2(
                (clientX / window.innerWidth) * 2 - 1,
                -(clientY / window.innerHeight) * 2 + 1,
            );
            zoomRaycaster.setFromCamera(pointer, camera);

            const model = state.selected.userData.detail;
            const hits = model && model.visible ? zoomRaycaster.intersectObject(model, true) : [];
            const aim = hits.length ? hits[0].point.clone() : controls.target.clone();

            // Same direction of view, closer in, centred on the spot - in the
            // space left of the drawer when it's open beside the model, not
            // behind it
            const offset = camera.position.clone().sub(controls.target).multiplyScalar(DETAIL_ZOOM);
            const { mode, fraction } = getPanelLayout(state.drawerOpen);
            const shift = new THREE.Vector3();
            if (state.drawerOpen && mode === 'side' && camera.isPerspectiveCamera) {
                const halfHeight = offset.length() * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
                shift.set(1, 0, 0).applyQuaternion(camera.quaternion)
                    .multiplyScalar(fraction * halfHeight * screen.aspect);
            }
            rig.moveCamera(aim.clone().add(offset).add(shift), aim.clone().add(shift), DETAIL_ZOOM_DURATION);
            state.detailZoomed = true;

            // Clear a hint that's mid-tap; the next one comes round as usual,
            // zoomed in or not
            ui.hideTapHint();
        },

        // `since` is seconds since the model was shown
        maybeShowTapHint(model, since) {
            if (since < state.tapHintNext) return;

            state.tapHintNext = since + TAP_HINT_GAP;

            /**
             * Not now - try again next time round. Zoomed in is fine: there it
             * invites the double-tap back out. So is the drawer on a wide
             * screen, where it sits beside the model; on a narrow one it
             * covers it.
             */
            const { mode, fraction } = getPanelLayout(state.drawerOpen);
            if ((state.drawerOpen && mode !== 'side') || rig.orientationLocked) return;

            // Clear of the drawer on the right, when it's open beside the model
            const maxX = Math.min(0.7, 1 - 2 * fraction - 0.15);

            const points = model.userData.points;
            if (!points || !model.visible) return;

            /**
             * A random point of the cloud that's comfortably on screen, clear
             * of the bar along the top. Zoomed in, most of the cloud is off
             * screen, so allow plenty of tries - each is one projected point.
             */
            const positions = points.geometry.attributes.position;
            for (let tries = 0; tries < 60; tries++) {
                tapHintPoint.fromBufferAttribute(positions, Math.floor(Math.random() * positions.count));
                points.localToWorld(tapHintPoint).project(rig.camera);

                if (tapHintPoint.x > -0.7 && tapHintPoint.x < maxX && tapHintPoint.y > -0.7 && tapHintPoint.y < 0.5) {
                    ui.showTapHint(
                        (tapHintPoint.x + 1) / 2 * screen.width,
                        (1 - tapHintPoint.y) / 2 * screen.height,
                    );
                    return;
                }
            }
        },
    };

    return detail;
}
