import * as THREE from 'three';
import { gsap } from 'gsap';
import { assetUrl } from './assets.js';
import { getPanelLayout, layoutMode } from './layout.js';
import { loadPhysics, PILE_FADE_OUT, PILE_REPLAY_WAIT } from './pile.js';
import { loadPointCloud } from './pointcloud/load.js';
import { GATHER_DURATION } from './pointcloud/gather.js';
import { getDissolve } from './pebbles/dissolve.js';
import { playScreenVideo } from './pointcloud/screenVideo.js';
import { armDrop, DROP_BOOM_HANG, DROP_OPEN_AFTER } from './pebbles/drop.js';
import { startArrival } from './pebbles/arrival.js';
import { restingFaceColor, restingRimColor } from './pebbles/materials.js';
import { detailSince, DETAIL_ROTATE_SPEED, isHeld, modelStartYaw, modelTurn } from './camera/framing.js';
import { findInsideSpot } from './camera/inside.js';
import { DETAIL_FOV, halfHeightAt } from './camera/rig.js';

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
const TAP_HINT_GAP = 8; // seconds from one hint to the next - it hangs, then falls away (engine/tags.js)

/**
 * A project's `drop.closeUp`: once a drop is at rest, the camera moves in on
 * one of the interlocks, holds there `hold` seconds while the pile turns -
 * following the crossing, so it stays where it landed on screen - moves back
 * out to the frame, and the pile drops again `after` seconds later. The
 * crossing is picked at random among those on screen; with none marked, it
 * just waits and drops again.
 */
const CLOSE_UP_AFTER = 1; // seconds after the pile is asleep - the dots have faded in
const CLOSE_UP_ZOOM = 0.3; // the camera ends up this fraction of its distance away
const CLOSE_UP_MOVE = 1.6; // seconds each way - slower than a double-click's zoom
const TURN_STOP = 3; // seconds the turn (and its floor) takes to slow to a stop before the next drop
// `view.fillScreen`: the whole device first, the points settling on its
// screen (the dissolve takes 3.6s), then the move in on the screen
const FILL_SCREEN_AT = 5; // seconds after the model is shown
const FILL_SCREEN_DURATION = 2.4; // seconds the move in takes

/**
 * A project's `autoZoom`: every that many seconds the camera moves in on a
 * random point of the model, or back out - the same move and following as
 * the close-up above. The first comes soon after the points have gathered,
 * once the double-click hint has been and gone, not a whole wait later; a
 * visitor's own double-click restarts the wait.
 */
const AUTO_ZOOM = 0.4; // the camera ends up this fraction of its distance away
const AUTO_ZOOM_FIRST = 5.6; // seconds after the gather (or the opening) to the first - as the first hint lets go and falls

/**
 * With `eyeLevel` too, the moves in go in threes: a point, then from inside
 * the model, then from the same place facing back the other way - inside,
 * standing at that share of its height among its columns (findInsideSpot)
 * and looking out level across it. The camera stays on its spot as the model
 * turns but keeps facing the same way, so the columns pass across the view.
 */
const INSIDE_LOOK = 0.3; // how far ahead it looks, as a share of the model's footprint
const INSIDE_MOVE = 2.4; // seconds to walk in - a longer way than to a point
const INSIDE_FOV = 65; // degrees - a wider lens than outside, the way eyes take in a room
const INSIDE_WIDTH = 55; // degrees across at least, so a tall phone screen still sees between the columns
const INSIDE_FOV_MAX = 90; // degrees - the most the lens widens for that
const INSIDE_NEAR = 0.05; // the camera's near plane while standing among the points (1 otherwise clips the nearest columns)
const INSIDE_PAN = 0.35; // radians the gaze drifts either side of its line, slowly
const INSIDE_PAN_PERIOD = 18; // seconds for one look left, right and back

export function createDetail({
    state, grid, rig, framing, screen, clock, visited, perlinTexture, ui,
}) {
    /**
     * Compiles a newly loaded model's shaders now - the points' and their
     * tails', which are hidden until the gather draws them - rather than
     * leaving it to the first frame they're drawn in, which stalls on it
     */
    function prepareShaders(model) {
        let scene = model;
        while (scene.parent) scene = scene.parent;
        const trails = model.userData.trails ?? [];
        trails.forEach((tails) => { tails.visible = true; });
        rig.renderer.compile(model, rig.camera, scene);
        trails.forEach((tails) => { tails.visible = false; });
    }

    /**
     * A model with a film on its screen: played straight away - unless the
     * project fills the window with that screen (`view.fillScreen`), when the
     * whole device is shown first while the points settle on its screen, and
     * the film waits for the camera to move in (maybeFillScreen)
     */
    function startScreen(model, project) {
        model.userData.screenFilled = false;
        if (!project.view?.fillScreen) playScreenVideo(model, true);
    }

    const zoomRaycaster = new THREE.Raycaster();
    zoomRaycaster.params.Points.threshold = 0.06;

    const tapHintPoint = new THREE.Vector3();
    const velocityPoint = new THREE.Vector3();

    // The timed zoom: when it next moves (in `since` seconds), the point it's
    // on while in (in the cloud's own space; null while out), whether that's
    // a spot inside, and how many times it has moved in
    const autoZoom = {
        next: Infinity, since: 0, local: null, inside: false, count: 0, last: null,
        spot: null, reach: 0, arrived: null, // standing inside: where, how far it looks, since when
    };
    const UP = new THREE.Vector3(0, 1, 0);
    const autoZoomPoint = new THREE.Vector3();

    // Where the close-up is: 'idle', 'in' (moving in or holding), 'out'
    // (moving out or waiting to drop). `settledAt` says which drop it's for.
    const closeUp = { phase: 'idle', pile: null, settledAt: null, at: 0, index: 0, last: null };
    const closeUpPoint = new THREE.Vector3();

    /**
     * Move the camera in on `aim`, `zoom` of the way it is now, keeping the
     * direction of view - in the space left of the drawer when it's open
     * beside the model, not behind it
     */
    function zoomTo(aim, zoom, duration) {
        const { camera, controls } = rig;
        const offset = camera.position.clone().sub(controls.target).multiplyScalar(zoom);
        const { mode, fraction } = getPanelLayout(state.drawerOpen);
        const shift = new THREE.Vector3();
        if (state.drawerOpen && mode === 'side' && camera.isPerspectiveCamera) {
            const halfHeight = halfHeightAt(camera.fov, offset.length());
            shift.set(1, 0, 0).applyQuaternion(camera.quaternion)
                .multiplyScalar(fraction * halfHeight * screen.aspect);
        }
        rig.moveCamera(aim.clone().add(offset).add(shift), aim.clone().add(shift), duration);
        state.detailZoomed = true;

        // Clear a hint that's mid-tap; the next one comes round as usual,
        // zoomed in or not
        ui.hideTapHint();
    }

    /**
     * Where something on the model will be in the world `ahead` seconds from
     * now, the model having turned on by then - `toWorld(target)` puts it in
     * the world as things stand
     */
    function worldAhead(model, ahead, toWorld, target) {
        const turned = model.rotation.y;
        model.rotation.y += ahead * DETAIL_ROTATE_SPEED;
        model.updateMatrixWorld(true);
        toWorld(target);
        model.rotation.y = turned;
        model.updateMatrixWorld(true);
        return target;
    }

    function contactAhead(model, pile, index, ahead, target) {
        return worldAhead(model, ahead, (t) => pile.contactAt(index, t), target);
    }

    /**
     * Keeps a point the camera has moved in on where it is on screen as the
     * model turns under it, by moving the camera with it - once the move
     * has arrived, and not after the visitor has zoomed back out or while
     * they orbit by hand. `tracker.last` is where it was last frame.
     */
    function follow(tracker, point) {
        if (rig.orientationLocked || !state.detailZoomed || rig.visitorOrbiting) {
            tracker.last = null;
            return;
        }
        if (tracker.last) {
            const moved = point.clone().sub(tracker.last);
            rig.camera.position.add(moved);
            rig.controls.target.add(moved);
        }
        tracker.last = (tracker.last ?? new THREE.Vector3()).copy(point);
    }

    // A crossing that will be on screen once the camera gets there, if any
    function pickContact(model, pile) {
        const count = pile.contactCount;
        if (!count) return -1;

        const start = Math.floor(Math.random() * count);
        for (let k = 0; k < count; k++) {
            const index = (start + k) % count;
            contactAhead(model, pile, index, CLOSE_UP_MOVE, closeUpPoint).project(rig.camera);
            if (Math.abs(closeUpPoint.x) < 0.8 && Math.abs(closeUpPoint.y) < 0.8) return index;
        }
        return start;
    }

    // Back out to the frame, if the close-up had moved in
    function endCloseUp() {
        if (closeUp.phase === 'in' && state.selected) {
            framing.reframe(state.selected, { duration: CLOSE_UP_MOVE });
        }
        closeUp.phase = 'idle';
    }

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
                gsap.to([other.material, other.userData.edges.material], { opacity: 0, duration: 0.8, ease: 'power2.out' });

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
            // ...but the visitor may orbit it by hand - unless the project
            // holds its view (`orbit: false`)
            rig.controls.enabled = project.orbit;

            // The grey fog rolls in behind the project as the camera moves in
            ui.onFog(true);

            // The first double-tap hint waits until the points have gathered
            state.tapHintNext = GATHER_DURATION + TAP_HINT_AFTER_GATHER;

            // ...and so does the first timed zoom
            const every = pebble.userData.project?.autoZoom;
            autoZoom.next = every ? (pebble.userData.project.gather ? GATHER_DURATION : 0) + AUTO_ZOOM_FIRST : Infinity;
            autoZoom.local = null;
            autoZoom.inside = false;
            autoZoom.count = 0;

            rig.enterDetailProjection();

            /**
             * This runs while the rest of the grid is still falling, which
             * already carries the motion - so the camera sets off at speed
             * and settles, rather than easing in from a standstill that reads
             * as a pause.
             */
            const ease = OPEN_CAMERA_EASE;

            /**
             * Which model: on a narrow screen a project may have its own
             * (`phone`), kept apart from the wide one so each loads once.
             * Chosen as it opens - turning the phone round mid-view keeps it.
             */
            const variant = project.phone && layoutMode() === 'stacked' ? 'phone' : 'main';
            const source = variant === 'phone'
                ? { ...project, detailModel: project.phone.detailModel, screenVideo: project.phone.screenVideo }
                : project;
            pebble.userData.details ??= {};
            if (pebble.userData.detail && pebble.userData.detail !== pebble.userData.details[variant]) {
                pebble.userData.detail.visible = false;
            }
            pebble.userData.detail = pebble.userData.details[variant] ?? null;
            pebble.userData.detailVariant = variant;

            if (pebble.userData.detail) {
                pebble.userData.detail.visible = true;
                pebble.userData.detail.rotation.y = modelStartYaw(project);
                pebble.userData.detail.userData.pile?.restart();
                pebble.userData.detail.userData.turnOffset = 0;
                pebble.userData.detail.userData.held = null;
                pebble.userData.detail.userData.gatherTime = 0;
                pebble.userData.detailRotateStartTime = clock.getElapsedTime();
                startScreen(pebble.userData.detail, project);
                ui.onStatus(null);
                framing.frameDetail(pebble, { ease });
                return;
            }

            // Frame the pebble now, then re-frame once the model is inside it
            ui.onStatus('Loading model');
            const openMoveEndsAt = clock.getElapsedTime() + OPEN_CAMERA_DURATION_LOADING;
            framing.frameDetail(pebble, { duration: OPEN_CAMERA_DURATION_LOADING, ease });

            loadPointCloud({
                url: assetUrl(source.detailModel),
                parent: pebble,
                perlinTexture,
                registerPointMaterial: rig.registerPointMaterial,
                gather: project.gather,
                points: project.points,
                drop: project.drop,
                solid: project.solid,
                screen: project.screen,
                screenVideo: source.screenVideo && assetUrl(source.screenVideo),
                // Say so rather than leave "Loading model" up forever, and
                // keep the real error for the browser's console
                onError: (error) => {
                    console.error('Could not load', source.detailModel, error);
                    if (state.selected === pebble) ui.onStatus('The model could not be loaded');
                },
                onLoaded: (model) => {
                    pebble.userData.details[variant] = model;
                    model.rotation.y = modelStartYaw(project);

                    // The visitor may have gone back while this was
                    // downloading, or reopened it on another screen width
                    if (pebble.userData.detailVariant !== variant) {
                        model.visible = false;
                        return;
                    }
                    pebble.userData.detail = model;
                    if (state.view !== 'detail' || state.selected !== pebble) {
                        model.visible = false;
                        return;
                    }

                    // Its shaders ready before the gather starts, not on its
                    // first frame
                    prepareShaders(model);
                    startScreen(model, project);

                    ui.onStatus(null);
                    model.userData.gatherTime = 0;
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
            closeUp.phase = 'idle';
            autoZoom.inside = false;
            autoZoom.local = null;
            rig.perspectiveCamera.near = rig.baseNear;
            rig.perspectiveCamera.updateProjectionMatrix();

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
            ui.hideTapHint(true); // even mid-dissolve
            state.tapHintNext = Infinity;

            if (pebble?.userData.detail) pebble.userData.detail.visible = false;
            playScreenVideo(pebble?.userData.detail, false);
            detail.hideVelocityTags();
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
         * Drop the pile again, from a double-click (`doubleClick: 'drop'`) or
         * between close-ups. The new drop
         * falls at the angle the model has reached rather than snapping back
         * to where it opened, and the turn picks up from there once it has
         * settled; the ground stays, and so does the camera.
         */
        replayDrop() {
            const model = state.selected?.userData.detail;
            const pile = model?.userData.pile;
            if (state.view !== 'detail' || !pile) return;

            endCloseUp();

            // The turn slows to a stop by the new drop, if it isn't already
            // (the close-up starts it sooner); the old pile dissolves
            // meanwhile, and the angle is taken when the new drop starts
            const pebble = state.selected;
            const since = detailSince(pebble, clock.getElapsedTime());
            if (!pile.turnStop && pile.settledAt !== Infinity) {
                pile.turnStop = { at: since, over: PILE_FADE_OUT + PILE_REPLAY_WAIT };
            }
            pile.replay(PILE_REPLAY_WAIT, () => {
                const since = detailSince(pebble, clock.getElapsedTime());
                model.userData.turnOffset = modelTurn(model, since);
            });
        },

        /**
         * A project's `drop.repeat`: drop the pile again this many seconds
         * after it has come to rest - after it LOOKS still (pile.settledAt),
         * so each drop lands and turns a while before the next. Timed from
         * the rest rather than the start, since a drop takes longer than a
         * short repeat to land. A double-click's drop resets the wait.
         */
        maybeRepeatDrop(model, since) {
            const pile = model.userData.pile;
            const drop = state.selected?.userData.project?.drop;
            if (!pile || pile.settledAt === Infinity) return;

            if (drop?.closeUp) {
                detail.runCloseUp(model, pile, drop.closeUp, since);
                return;
            }

            if (drop?.repeat && since - pile.settledAt >= drop.repeat) detail.replayDrop();
        },

        // A project's `autoZoom`, a step each frame
        // `since` is seconds since the model was shown: `view.fillScreen`'s
        // move in on the screen, and its film starting with it
        maybeFillScreen(model, since) {
            const project = state.selected?.userData.project;
            if (!project?.view?.fillScreen || !model.userData.screen || model.userData.screenFilled) return;
            if (since < FILL_SCREEN_AT) return;

            model.userData.screenFilled = true;
            playScreenVideo(model, true);
            framing.reframe(state.selected, { duration: FILL_SCREEN_DURATION });
        },

        maybeAutoZoom(model, since) {
            const project = state.selected?.userData.project;
            const every = project?.autoZoom;
            autoZoom.since = since;
            if (!every) return;

            const points = model.userData.points;
            const toWorld = (local) => (target) => points.localToWorld(target.copy(local));

            // While in, the camera follows its point as the model turns
            if (autoZoom.local && points) follow(autoZoom, toWorld(autoZoom.local)(autoZoomPoint));

            /**
             * Standing inside, the camera keeps its place and gaze in the
             * model's own frame - turning with it, so it never walks into a
             * column - and its gaze drifts slowly side to side. Once there;
             * left to the visitor if they orbit or zoom out.
             */
            if (autoZoom.inside && points && !rig.orientationLocked) {
                if (!state.detailZoomed || rig.visitorOrbiting) {
                    // Whatever took the camera out (the drawer, the visitor)
                    // may not have set the lens back
                    autoZoom.inside = false;
                    if (!state.detailZoomed) rig.animateFov(DETAIL_FOV[getPanelLayout(state.drawerOpen).mode], CLOSE_UP_MOVE);
                } else {
                    autoZoom.arrived ??= since;
                    const pan = INSIDE_PAN * Math.sin(((since - autoZoom.arrived) / INSIDE_PAN_PERIOD) * Math.PI * 2);
                    const { position, direction } = autoZoom.spot;
                    const gaze = direction.clone().applyAxisAngle(UP, pan);
                    points.localToWorld(rig.camera.position.copy(position));
                    points.localToWorld(rig.controls.target.copy(position).addScaledVector(gaze, autoZoom.reach));
                }
            }

            // Back to the usual near plane once it has walked out
            if (!autoZoom.inside && !rig.orientationLocked && rig.perspectiveCamera.near !== rig.baseNear) {
                rig.perspectiveCamera.near = rig.baseNear;
                rig.perspectiveCamera.updateProjectionMatrix();
            }

            if (since < autoZoom.next) return;

            /**
             * Not while the camera is already moving, or the visitor is
             * orbiting or has held the model still, or a narrow screen's
             * drawer covers the model - try again shortly
             */
            const { mode } = getPanelLayout(state.drawerOpen);
            if (rig.orientationLocked || rig.visitorOrbiting || isHeld(model) || (state.drawerOpen && mode !== 'side') || !points) {
                autoZoom.next = since + 1;
                return;
            }
            autoZoom.next = since + every;

            if (state.detailZoomed) {
                framing.reframe(state.selected, { duration: autoZoom.inside ? INSIDE_MOVE : CLOSE_UP_MOVE });
                autoZoom.local = null;
                autoZoom.inside = false;
                return;
            }

            autoZoom.count += 1;
            autoZoom.last = null;

            /**
             * In turn: on a point of the model; from inside at eye level;
             * then from the same place inside, turned to face back the
             * other way
             */
            const phase = autoZoom.count % 3;
            const spot = project.eyeLevel && phase !== 1
                ? findInsideSpot(points, project.eyeLevel, phase === 0 ? autoZoom.spot : null)
                : null;
            if (spot) {
                const box = points.geometry.boundingBox;
                autoZoom.reach = INSIDE_LOOK * Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
                autoZoom.spot = spot;
                autoZoom.arrived = null;

                const ahead = spot.position.clone().addScaledVector(spot.direction, autoZoom.reach);
                const eye = worldAhead(model, INSIDE_MOVE, toWorld(spot.position), new THREE.Vector3());
                const look = worldAhead(model, INSIDE_MOVE, toWorld(ahead), new THREE.Vector3());
                rig.perspectiveCamera.near = INSIDE_NEAR;
                rig.perspectiveCamera.updateProjectionMatrix();
                rig.moveCamera(eye, look, INSIDE_MOVE);
                // A lens's fov is its height; on a tall screen that leaves
                // little across, so widen it until it's INSIDE_WIDTH across
                const across = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(INSIDE_WIDTH) / 2) / screen.aspect));
                rig.animateFov(Math.min(Math.max(INSIDE_FOV, across), INSIDE_FOV_MAX), INSIDE_MOVE);
                state.detailZoomed = true;
                ui.hideTapHint();

                autoZoom.inside = true;
                autoZoom.local = null;
                return;
            }

            /**
             * In on a random point of the cloud that will be well inside the
             * frame once the camera gets there, aimed where it will be by
             * then
             */
            const position = points.geometry.attributes.position;
            for (let tries = 0; tries < 40; tries++) {
                const local = new THREE.Vector3().fromBufferAttribute(position, Math.floor(Math.random() * position.count));
                worldAhead(model, CLOSE_UP_MOVE, toWorld(local), autoZoomPoint);
                const aim = autoZoomPoint.clone();
                autoZoomPoint.project(rig.camera);
                if (Math.abs(autoZoomPoint.x) < 0.5 && Math.abs(autoZoomPoint.y) < 0.5) {
                    zoomTo(aim, AUTO_ZOOM, CLOSE_UP_MOVE);
                    autoZoom.local = local;
                    autoZoom.inside = false;
                    return;
                }
            }
        },

        // Whether the timed zoom has the camera standing inside the model -
        // the camera's nod holds off meanwhile, so it stays at eye level
        get standingInside() {
            return autoZoom.inside && state.detailZoomed;
        },

        // A project's `drop.closeUp`, a step each frame once the pile is at rest
        runCloseUp(model, pile, { hold, after }, since) {
            // A new drop has come to rest
            if (closeUp.pile !== pile || closeUp.settledAt !== pile.settledAt) {
                Object.assign(closeUp, { phase: 'waiting', pile, settledAt: pile.settledAt });
            }

            if (closeUp.phase === 'waiting' && since - pile.restedAt >= CLOSE_UP_AFTER) {
                closeUp.index = pickContact(model, pile);
                closeUp.at = since;
                closeUp.last = null;

                if (closeUp.index < 0) {
                    closeUp.phase = 'out'; // nothing to look at: wait, then drop
                } else {
                    // Aimed where the crossing will be once the camera is there
                    zoomTo(contactAhead(model, pile, closeUp.index, CLOSE_UP_MOVE, closeUpPoint).clone(), CLOSE_UP_ZOOM, CLOSE_UP_MOVE);
                    closeUp.phase = 'in';
                }
            }

            if (closeUp.phase === 'in') {
                // Once there, the camera follows the crossing as the pile turns
                follow(closeUp, pile.contactAt(closeUp.index, closeUpPoint));

                if (since - closeUp.at >= CLOSE_UP_MOVE + hold) {
                    endCloseUp();
                    closeUp.phase = 'out';
                    closeUp.at = since;
                }
            }

            if (closeUp.phase === 'out') {
                // The turn and its floor slow to a stop by the time it drops
                const dropAt = closeUp.at + CLOSE_UP_MOVE + after;
                if (!pile.turnStop && since >= dropAt - TURN_STOP) {
                    pile.turnStop = { at: since, over: Math.max(dropAt - since, 0.5) };
                }
                if (since >= dropAt) detail.replayDrop();
            }
        },

        /**
         * The live speed beside each moving aggregate (`drop.velocity`), as
         * HTML written straight from the render loop - it changes every
         * frame, so never through React state. Beside its centre, on screen.
         */
        updateVelocityTags(model) {
            const tags = ui.overlays.velocityTags ?? [];
            const readings = model.userData.pile?.velocities() ?? [];

            tags.forEach((tag, i) => {
                const reading = readings[i];
                if (!reading || reading.show <= 0) {
                    tag.style.opacity = 0;
                    return;
                }

                velocityPoint.set(reading.position.x, reading.position.y, reading.position.z);
                const [x, y] = rig.toScreen(model.localToWorld(velocityPoint));
                const text = `${reading.mps.toFixed(2)} m/s`;
                if (tag.textContent !== text) tag.textContent = text;
                tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(0.9rem, -50%)`;
                tag.style.opacity = reading.show;
            });
        },

        hideVelocityTags() {
            (ui.overlays.velocityTags ?? []).forEach((tag) => { tag.style.opacity = 0; });
        },

        // A double-click or double-tap on the model: whatever the project's
        // `doubleClick` says
        doubleClick(clientX, clientY) {
            if (state.view !== 'detail' || !state.selected) return;

            // A hint on screen has done its job: it dissolves
            ui.dissolveTapHint();

            const action = state.selected.userData.project?.doubleClick ?? 'zoom';
            if (action === 'zoom') detail.toggleZoom(clientX, clientY);
            else if (action === 'hold') detail.toggleHold();
            else if (action === 'drop') detail.replayDrop();
        },

        /**
         * `doubleClick: 'hold'`: stop the model's turn where it is - and the
         * camera's nod with it - or start it again from there
         */
        toggleHold() {
            const model = state.selected?.userData.detail;
            if (!model) return;

            const since = detailSince(state.selected, clock.getElapsedTime());
            const held = (model.userData.held ??= { total: 0, at: null });
            if (held.at === null) {
                held.at = since;
            } else {
                held.total += since - held.at;
                held.at = null;

                // The timed zoom waits a full round after it turns again
                const every = state.selected.userData.project?.autoZoom;
                if (every) autoZoom.next = since + every;
            }
        },

        toggleZoom(clientX, clientY) {
            if (state.view !== 'detail' || !state.selected) return;

            // A visitor's own zoom isn't undone by the timed one straight after
            const every = state.selected.userData.project?.autoZoom;
            if (every) {
                autoZoom.next = autoZoom.since + every;
                autoZoom.local = null;
                autoZoom.inside = false;
            }

            const { camera, controls } = rig;

            if (state.detailZoomed) {
                framing.reframe(state.selected, { duration: DETAIL_ZOOM_DURATION });
                return;
            }

            const pointer = rig.pointerToNdc(clientX, clientY, new THREE.Vector2());
            zoomRaycaster.setFromCamera(pointer, camera);

            const model = state.selected.userData.detail;
            const hits = model && model.visible ? zoomRaycaster.intersectObject(model, true) : [];
            const aim = hits.length ? hits[0].point.clone() : controls.target.clone();

            // Same direction of view, closer in, centred on the spot
            zoomTo(aim, DETAIL_ZOOM, DETAIL_ZOOM_DURATION);
        },

        // `since` is seconds since the model was shown
        maybeShowTapHint(model, since) {
            if (since < state.tapHintNext) return;
            if (closeUp.phase === 'in') return; // the close-up's camera is busy
            const action = state.selected?.userData.project?.doubleClick ?? 'zoom';
            if (action === 'none') return; // nothing to hint at
            if (action === 'hold' && isHeld(model)) return; // already still: nothing to pause

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

            // (a pile's aggregates are hidden while they wait to drop)
            const points = model.userData.points;
            if (!points || !model.visible || !points.visible) return;

            /**
             * A random point of the cloud that's comfortably on screen, clear
             * of the bar along the top and with room below for the string and
             * words hanging from it (engine/tags.js). Zoomed in, most of the cloud is off
             * screen, so allow plenty of tries - each is one projected point.
             */
            const positions = points.geometry.attributes.position;
            for (let tries = 0; tries < 60; tries++) {
                tapHintPoint.fromBufferAttribute(positions, Math.floor(Math.random() * positions.count));
                // In pixels; projects tapHintPoint in place, for the test below
                const [x, y] = rig.toScreen(points.localToWorld(tapHintPoint));

                if (tapHintPoint.x > -0.7 && tapHintPoint.x < maxX && tapHintPoint.y > -0.5 && tapHintPoint.y < 0.5) {
                    ui.showTapHint(x, y, action);
                    return;
                }
            }
        },
    };

    return detail;
}
