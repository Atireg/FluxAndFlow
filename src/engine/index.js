import * as THREE from 'three';
import { assetUrl, textureLoader } from './assets.js';
import { createBoot } from './boot.js';
import { createState } from './state.js';
import { createVisited } from './visited.js';
import { createCameraRig } from './camera/rig.js';
import { createFraming, DETAIL_ROTATE_SPEED, modelStartYaw } from './camera/framing.js';
import { createCatalog, findPebble } from './catalog.js';
import { createDetail } from './detail.js';
import { createTags } from './tags.js';
import { createStreamsView } from './streams-view.js';
import { createFlow } from './pebbles/flow.js';
import { applyArrival, ARRIVAL_AFTER_LOADER, startArrival } from './pebbles/arrival.js';
import { initSpotlightCycle, updateSpotlightCycle } from './pebbles/spotlight.js';
import { placeAtRest } from './pebbles/wander.js';
import { paintGlow } from './pebbles/materials.js';
import { pebbleFluxTime, PEBBLE_FLUX_SPEED } from './pebbles/geometry.js';
import { dropInProgress, placeDroppingPebble, updateDroppingPebble } from './pebbles/drop.js';
import { updateDissolve } from './pebbles/dissolve.js';
import { GATHER_DURATION, revealAt, setGather, setReveal } from './pointcloud/gather.js';
import { trailResolution } from './pointcloud/trails.js';

/**
 * The 3D engine.
 *
 * Everything in here is imperative three.js driven by one render loop, and
 * deliberately stays that way: a pebble's whole visual state is recomputed
 * from its mode and the clock every frame (see catalog.js), which is not
 * something React's render model helps with. React owns the page's HTML and
 * the state that changes rarely; the engine owns the canvas and the per-frame
 * writes. They meet at the `ui` object below and the handful of methods
 * returned. See DECISIONS.md.
 *
 * `ui` is supplied by the React layer:
 *   onProjectOpen(project)  a project has opened - show its bar and drawer
 *   onProjectClose()        back to the catalog
 *   onStatus(message|null)  what to say in the project bar
 *   onFog(boolean)          roll the grey fog in or out
 *   barFraction()           how much viewport height the bar takes, 0..0.5
 *   showTapHint(x, y) / hideTapHint()
 *   overlays                the DOM nodes the tags are drawn into
 */
export function createEngine({ canvas, source, ui }) {
    const screen = {
        width: window.innerWidth,
        height: window.innerHeight,
        aspect: window.innerWidth / window.innerHeight,
    };

    const scene = new THREE.Scene();

    /**
     * Scene fog is off: the original config was inverted (near beyond far),
     * which rendered everything NEARER than 15 units fully fogged. The grey
     * fog in the project view is a CSS layer behind the transparent canvas
     * instead. See DECISIONS.md before re-adding it.
     */
    scene.fog = null;

    const ambientLight = new THREE.AmbientLight('#86cdff');
    ambientLight.intensity = 5;
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight('#86cdff', 1);
    scene.add(directionalLight);

    const clock = new THREE.Clock();
    const state = createState();
    const visited = createVisited();
    const boot = createBoot();

    // The grid, shared by reference: the catalog fills it, the camera frames it
    const grid = { pebbles: [], shape: { cols: 1, rows: source.slotCount } };

    const perlinAsset = boot.asset();
    const perlinTexture = textureLoader.load(
        assetUrl('textures/perlin.png'),
        perlinAsset.done,
        undefined,
        perlinAsset.done,
    );
    perlinTexture.wrapS = THREE.RepeatWrapping;
    perlinTexture.wrapT = THREE.RepeatWrapping;

    const rig = createCameraRig({
        canvas,
        scene,
        screen,
        onShaderError: () => ui.onStatus('The model could not be drawn'),
    });

    const framing = createFraming({ rig, screen, state, grid, ui });
    const flow = createFlow(grid.pebbles);

    const catalog = createCatalog({ scene, grid, state, boot, visited, source });

    const detail = createDetail({
        state,
        grid,
        rig,
        framing,
        screen,
        clock,
        visited,
        perlinTexture,
        ui: { ...ui, resetFlow: () => flow.reset() },
    });

    const tags = createTags({ screen, rig, state, overlays: ui.overlays });
    const streams = createStreamsView({ scene, grid, state, rig });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundHit = new THREE.Vector3();

    // Where a pointer event lands on the pebbles' plane - one raycast read by
    // both the flow and the streams
    function pointerToGround(event) {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(pointer, rig.camera);

        return raycaster.ray.intersectPlane(groundPlane, groundHit) ? groundHit : null;
    }

    function pebbleAt(event) {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(pointer, rig.camera);

        const intersects = raycaster.intersectObjects(grid.pebbles);
        return intersects.length ? findPebble(intersects[0].object) : null;
    }

    let lastFrameTime = 0;
    let frameRequest = null;

    function animate() {
        frameRequest = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        pebbleFluxTime.value = elapsedTime * PEBBLE_FLUX_SPEED;
        rig.renderer.getDrawingBufferSize(trailResolution.value);

        const frameTime = Math.min(elapsedTime - lastFrameTime, 0.05);
        lastFrameTime = elapsedTime;

        /**
         * The catalog's own motion - wander, the flow, the spotlight - only
         * runs while it is actually what's on screen. A click hands every
         * pebble to the drop until the project opens; they then hold wherever
         * it left them, hidden by openProject's fade, until 'returning'
         * places them back home.
         */
        if (state.view === 'catalog') {
            updateSpotlightCycle(state, grid.pebbles, elapsedTime);
            // Each pebble's own place first; the flow and the bumps read it
            grid.pebbles.forEach((pebble) => catalog.updatePebble(pebble, elapsedTime));
            flow.update(frameTime);
            grid.pebbles.forEach(flow.apply);
            grid.pebbles.forEach((pebble) => applyArrival(pebble, state.arrivalStartedAt, elapsedTime));
        } else if (state.view === 'dropping') {
            grid.pebbles.forEach((pebble) => updateDroppingPebble(pebble, state, elapsedTime));
            updateDissolve({ state, renderer: rig.renderer, camera: rig.camera, elapsedTime });
        } else if (state.view === 'returning') {
            // Back home before they fade in, wherever the drop left them -
            // and already pushed apart, so they don't spring apart as they
            // appear
            grid.pebbles.forEach((pebble) => {
                placeAtRest(pebble, elapsedTime);
                paintGlow(pebble, 0);
                pebble.userData.content?.scale.setScalar(pebble.userData.contentBaseScale);
            });
            flow.update(frameTime);
            grid.pebbles.forEach(flow.apply);
            grid.pebbles.forEach((pebble) => applyArrival(pebble, state.arrivalStartedAt, elapsedTime));
        } else {
            // The camera starts moving in before the drop has finished - the
            // rest of the fall plays out under openProject's fade
            if (dropInProgress(state, elapsedTime)) {
                grid.pebbles.forEach((pebble) => {
                    if (pebble !== state.selected) placeDroppingPebble(pebble, state, elapsedTime);
                });
            }
            updateDissolve({ state, renderer: rig.renderer, camera: rig.camera, elapsedTime });

            const selected = state.selected;

            if (selected?.userData.detail) {
                const model = selected.userData.detail;
                const project = selected.userData.project;

                // Turns the model itself, not the camera, so the pebble's
                // edges stay square to the canvas - see DETAIL_ROTATE_SPEED
                const since = elapsedTime - selected.userData.detailRotateStartTime;

                // A pile falls first and only starts turning once it has settled
                const pile = model.userData.pile;
                pile?.step(frameTime, since);
                const turning = pile ? Math.max(since - pile.settledAt, 0) : since;
                model.rotation.y = modelStartYaw(project) + turning * DETAIL_ROTATE_SPEED;

                // A pile's ground (the pebble's dissolve, landed) turns with it
                const dissolve = selected.userData.dissolve;
                if (pile && dissolve?.userData.ground) dissolve.rotation.y = turning * DETAIL_ROTATE_SPEED;

                // Replays from scattered each time the project opens, since
                // detailRotateStartTime is reset whenever the model is shown
                setGather(model, Math.min(since / GATHER_DURATION, 1));
                setReveal(model, revealAt(since));

                detail.maybeShowTapHint(model, since);
                framing.updateSway(project, since, elapsedTime);
            }
        }

        tags.update(elapsedTime);
        streams.update(frameTime, elapsedTime);

        /**
         * Update controls - except while a camera move is driving orientation
         * itself (see moveCamera), since controls.update() would re-derive
         * orientation from the camera's raw position each frame and fight it.
         */
        if (!rig.orientationLocked) rig.controls.update();

        rig.render();
    }

    /**
     * Input.
     *
     * Selecting answers the press's own pointerup on the canvas, not a
     * `click` on window: Safari on iPhone and iPad doesn't send `click` for a
     * tap on a plain canvas, so a window-level click listener never heard it
     * and a tap on a pebble silently did nothing. Pointer events arrive in
     * every browser. See DECISIONS.md.
     */
    const DRAG_THRESHOLD = 5; // px
    const DOUBLE_TAP_TIME = 350; // ms between taps, by when they happened
    const DOUBLE_TAP_DISTANCE = 30; // px between taps

    let pointerDownAt = null;
    let lastPointerType = 'mouse';
    let lastTap = null;

    // Orbiting a project ends in a click, so remember where the press started
    // and treat anything that travelled as a drag rather than a selection
    function wasDrag(event) {
        if (!pointerDownAt) return false;

        return Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y) > DRAG_THRESHOLD;
    }

    const listeners = [];

    function on(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        listeners.push(() => target.removeEventListener(type, handler, options));
    }

    function bindInput() {
        on(window, 'resize', onResize);

        // Hover is tracked but deliberately changes nothing about a pebble's
        // looks - it only keeps the spotlight off the pebble under the cursor
        on(window, 'mousemove', (event) => {
            if (state.view !== 'catalog') return;

            state.hovered = pebbleAt(event);
        });

        // Leaving the window lets go of the pebble it was over
        on(document.documentElement, 'mouseleave', () => { state.hovered = null; });

        // Pointer, not mouse, so a finger dragged across the grid stirs it too
        on(window, 'pointermove', (event) => {
            if (state.view !== 'catalog') return;

            const hit = pointerToGround(event);
            if (!hit) return;

            flow.track(hit);
            streams.trackPointer(hit);
        });

        on(window, 'pointerdown', (event) => {
            pointerDownAt = { x: event.clientX, y: event.clientY };

            if (state.view === 'catalog') {
                const hit = pointerToGround(event);
                if (hit) streams.trackPointer(hit);
            }

            if (event.pointerType !== 'mouse') streams.setTouching(true);
        });

        const release = (event) => {
            if (event.pointerType !== 'mouse') streams.setTouching(false);
        };
        on(window, 'pointerup', release);
        on(window, 'pointercancel', release);

        on(canvas, 'pointerdown', (event) => { lastPointerType = event.pointerType; });

        /**
         * A mouse sends dblclick; a finger often doesn't, so taps are timed by
         * hand. Some browsers do send dblclick for a double-tap as well, which
         * would zoom in and straight back out - so dblclick only counts for a
         * mouse.
         */
        on(canvas, 'dblclick', (event) => {
            if (lastPointerType === 'mouse') detail.toggleZoom(event.clientX, event.clientY);
        });

        on(canvas, 'pointerup', (event) => {
            // The model's double-tap zoom
            if (event.pointerType !== 'mouse' && !wasDrag(event)) {
                // The event's own time, not when it was handled - a busy frame
                // can delay handling enough to split a real double-tap in two
                const now = event.timeStamp;
                const isDouble = lastTap
                    && now - lastTap.time < DOUBLE_TAP_TIME
                    && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < DOUBLE_TAP_DISTANCE;

                if (isDouble) {
                    lastTap = null;
                    detail.toggleZoom(event.clientX, event.clientY);
                } else {
                    lastTap = { time: now, x: event.clientX, y: event.clientY };
                }
            }

            onCanvasSelect(event);
        });

        // The pebbles surface as the loader starts to leave - or at once,
        // should there be no loader
        on(window, 'fluxloader:leaving', () => {
            startArrival(state, grid.pebbles, clock.getElapsedTime() + ARRIVAL_AFTER_LOADER);
        });
    }

    // Picking a pebble in the catalog. Only the main mouse button; a touch or
    // pen always counts.
    function onCanvasSelect(event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (state.view !== 'catalog' || wasDrag(event)) return;

        const pebble = pebbleAt(event);
        if (!pebble) return;

        if (pebble.userData.project) {
            detail.startDrop(pebble);
            return;
        }

        // Empty slots have nothing to open yet - say so rather than ignore the
        // click. Clicking again restarts the timer.
        state.emptyTag.pebble = pebble;
        state.emptyTag.shownAt = clock.getElapsedTime();
    }

    function onResize() {
        screen.width = window.innerWidth;
        screen.height = window.innerHeight;
        screen.aspect = screen.width / screen.height;

        rig.resize();

        /**
         * Re-arrange the pebbles that already exist. They are never rebuilt,
         * so a project keeps its slot and anything already loaded stays
         * loaded.
         */
        if (state.view === 'catalog') {
            catalog.layout(screen.aspect);
            framing.fitToGrid();
            return;
        }

        // The drawer changes size and may switch sides, so re-frame
        if (state.selected) framing.reframe(state.selected, { duration: 0.4 });
    }

    return {
        start() {
            catalog.build(screen.aspect);
            framing.fitToGrid();
            initSpotlightCycle(state);
            flow.reset();
            bindInput();

            // Everything the catalog loads at start-up has registered by now
            boot.seal();

            // No loader on the page at all: surface straight away
            if (!document.getElementById('loader')) {
                requestAnimationFrame(() => startArrival(state, grid.pebbles, clock.getElapsedTime()));
            }

            animate();
        },

        closeProject() {
            detail.closeProject();
        },

        /**
         * The drawer has been pulled out or pushed back. Opening makes room
         * for it - beside the model on a wide screen, the close-up on a narrow
         * one; closing returns to the full-fit view.
         */
        setDrawerOpen(open, { reframe = true } = {}) {
            state.drawerOpen = open;

            if (!reframe || !state.selected) return;

            if (open) {
                framing.frameWithDrawerOpen(state.selected, { duration: 1.1 });
            } else {
                framing.frameDetail(state.selected, { duration: 0.8 });
            }
        },

        dispose() {
            if (frameRequest !== null) cancelAnimationFrame(frameRequest);
            listeners.forEach((off) => off());
            listeners.length = 0;
            rig.renderer.dispose();
        },
    };
}
