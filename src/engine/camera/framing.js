import * as THREE from 'three';
import { gsap } from 'gsap';
import { CUBE_SIZE, PEBBLE_RADIUS, SPACING } from '../constants.js';
import { getPanelLayout, perLayout } from '../layout.js';
import { GATHER_DURATION } from '../pointcloud/gather.js';
import { smooth01 } from '../ease.js';
import { sectionAt, traceCut } from '../pointcloud/load.js';
import {
    CATALOG_FOV,
    DETAIL_FOV,
    DETAIL_PROJECTION,
    ORTHO_VIEW_DISTANCE,
} from './rig.js';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Where the camera goes.
 *
 * Read the DECISIONS.md entries on the camera and projection maths before
 * touching any of this: the numbers here were fitted against reference
 * screenshots and several of them are not interchangeable.
 */

/**
 * How much room to leave around a project. Above 1 the whole box fits with
 * air around it; below 1 the view crops into it.
 *
 * Crop only where there is room going spare. On a phone with the drawer
 * parked, the frame is far taller than the pavilion is deep: the fit is
 * limited by width and leaves the model marooned in a thin band, so cropping
 * its sparse ends buys scale cheaply. Pull the drawer out and the free area
 * is short enough that height becomes the limit instead - the same crop would
 * take the top off the pebble, so the margin eases back past 1.
 *
 * Not interchangeable: `stackedParked` is below 1 and `stackedOpen` above
 * it - check both when touching this.
 */
const DETAIL_MARGIN = { side: 1.12, stackedParked: 0.88, stackedOpen: 1.05 };

// Room around the pebble for a project with its own view - calibrated so the
// Rock Print shot lands at the same size as the screenshot it was fitted to
const VIEW_FRAME_MARGIN = 1.16;

// Room around the whole grid in the catalog
const GRID_MARGIN = 1.15;

/**
 * A full turn every 80s - slow enough to read as ambient rather than as
 * something to watch (40s looked too fast), same spirit as the catalog's own
 * wander. Turns the model itself, not the camera - see DECISIONS.md for why
 * that distinction matters here.
 */
export const DETAIL_ROTATE_SPEED = (2 * Math.PI) / 80;

// A project's own turn, a revolution in `view.spin` seconds (80 by default)
export const detailRotateSpeed = (project) => (2 * Math.PI) / (project?.view?.spin ?? 80);

// The model was authored to be seen from -X; turning it a quarter shows that
// same face to a camera on +Z
const DETAIL_MODEL_YAW = Math.PI / 2;

/**
 * Sway: a project with `view.sway` has its camera slowly nod up and back
 * down around what it's looking at, by that many degrees either side, while
 * the model turns - a second, slower motion, so the piece is seen from a
 * little above and below its view as well as all the way round.
 *
 * Applied as a change from the last frame's angle rather than as an absolute
 * pose, so it rides on top of wherever the camera is: the project's view, the
 * drawer's close-up, a double-tap zoom, or wherever the visitor has orbited
 * to. It holds while anything else moves the camera (a move in flight, the
 * visitor's hand) and, for a gathering cloud, until the gather is done, so
 * the landing shot is exactly the fitted one. Each time it resumes it starts
 * from zero where the camera now is and grows in over SWAY_EASE_IN - no jump.
 */
const SWAY_PERIOD = 22; // seconds for one nod up, down and back
const SWAY_POLE = 0.12; // radians - the nod stops this far short of looking straight down (or up)
const SWAY_EASE_IN = 2; // seconds to grow into the full nod after resuming

/**
 * A close, elevated crop of the model, used while the drawer is open on a
 * narrow screen - the description is the thing being read then, not the piece
 * as a whole, so the shot trades the full-fit square-on view for a tighter,
 * more atmospheric one. Deliberately not one-point and not fit to the whole
 * box - see DECISIONS.md for why that's fine here specifically.
 */
const CLOSEUP_ELEVATION = 38; // degrees
const CLOSEUP_DISTANCE_FACTOR = 1.1;

/**
 * The fit of a pile's box allows for any turn and for its depth, which on a
 * phone's short strip above the drawer leaves it small - so closer there:
 * 1.6 only kept it about the size it was before, which didn't read as a
 * zoom; at 2.2 it fills the strip, its outer rods running off the edges.
 */
const PILE_DRAWER_ZOOM = { side: 1, stacked: 2.2 };

/**
 * Unit vector from the model towards the camera for a project's view, or for
 * its heading at a different elevation.
 *
 * Azimuth 0 means looking along -Z, the catalog's own screen-up, so
 * screen-right is world +X in both views and moving between them is a tilt,
 * with no roll. Azimuth turns the grid by that much on the way in and out,
 * so keep it small - see DECISIONS.md.
 */
function viewDirection(project, { elevation: elevationDeg = perLayout(project?.view?.elevation, 0) } = {}) {
    const elevation = THREE.MathUtils.degToRad(elevationDeg);
    const azimuth = THREE.MathUtils.degToRad(project?.view?.azimuth ?? 0);

    return new THREE.Vector3(
        Math.sin(azimuth) * Math.cos(elevation),
        Math.sin(elevation),
        Math.cos(azimuth) * Math.cos(elevation),
    );
}

/**
 * The way a camera looks onto a model's section (world space), given the
 * model's length (`along`, a unit vector, away from the side cut away):
 * square-on along it, or `side` degrees round from it and `above` degrees
 * down onto it
 */
function towardSection(along, side, above) {
    const toward = along.clone().applyAxisAngle(UP, THREE.MathUtils.degToRad(side));
    toward.y = 0;
    toward.normalize().multiplyScalar(Math.cos(THREE.MathUtils.degToRad(above)));
    toward.y = -Math.sin(THREE.MathUtils.degToRad(above));
    return toward;
}

// Half the extent along `axis` (a unit vector) of a box `half` across each way
function halfExtentAlong(axis, half) {
    return Math.abs(axis.x) * half.x + Math.abs(axis.y) * half.y + Math.abs(axis.z) * half.z;
}

// Seconds since a project's model was shown (its pebble's
// `detailRotateStartTime`) - the clock its turn, gather and timings run on
export function detailSince(pebble, elapsedTime) {
    return elapsedTime - pebble.userData.detailRotateStartTime;
}

/**
 * How long a model's turn has been held still, by `since`:
 * `model.userData.held` is { total, at, by } - the time held before, when
 * the current hold began (null while turning), and what holds it: 'click'
 * (a project's `doubleClick: 'hold'`), 'hover' (a part under the pointer).
 * It turns again once nothing does.
 */
function heldFor(model, since) {
    const held = model.userData.held;
    if (!held) return 0;
    return held.total + (held.at === null ? 0 : since - held.at);
}

export function isHeld(model) {
    return model.userData.held?.at != null;
}

export function isHeldBy(model, reason) {
    return Boolean(model.userData.held?.by.has(reason));
}

// Hold the model's turn for `reason`, or let go of it; true if that changed
// whether it turns
export function setHold(model, reason, holding, since) {
    const held = (model.userData.held ??= { total: 0, at: null, by: new Set() });
    const was = held.at !== null;
    if (holding) held.by.add(reason);
    else held.by.delete(reason);
    if (held.by.size && !was) held.at = since;
    if (!held.by.size && was) {
        held.total += since - held.at;
        held.at = null;
    }
    return was !== (held.at !== null);
}

// Where a project's model starts its slow rotation: the quarter turn above,
// plus the project's own `view.turn`
export function modelStartYaw(project) {
    return DETAIL_MODEL_YAW + THREE.MathUtils.degToRad(perLayout(project?.view?.turn, 0));
}

/**
 * How long the model has been turning, in seconds at DETAIL_ROTATE_SPEED,
 * `since` it was shown. A pile only turns once it looks still; dropped
 * again by hand, it keeps the angle it had reached (`turnOffset`) and
 * carries on from there once the new drop settles, rather than snapping
 * back to where it opened. Before a new drop it slows to a stop
 * (`pile.turnStop`, { at, over } in the same seconds as `since`): its speed
 * falls evenly to nothing over `over`, so it comes to rest smoothly
 * instead of halting the moment the pile restarts.
 */
export function modelTurn(model, since) {
    const pile = model.userData.pile;
    if (!pile) return since - heldFor(model, since);

    const offset = model.userData.turnOffset ?? 0;
    const turning = Math.max(since - pile.settledAt, 0);
    const stop = pile.turnStop;
    if (!stop || since <= stop.at) return offset + turning;

    const before = Math.max(stop.at - pile.settledAt, 0);
    const slowing = Math.min(since - stop.at, stop.over);
    return offset + before + slowing - (slowing * slowing) / (2 * stop.over);
}

// A box's eight corners
function boxCorners(box) {
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        corners.push(new THREE.Vector3(x, y, z));
    }
    return corners;
}

// `view.drawer: 'whole'` on a narrow screen: the whole model above the
// drawer, this far back from its plain fit so the handle doesn't cover it
const WHOLE_ABOVE_DRAWER_ZOOM = 0.72;
// Room left beside a device's own sides when its screen fills the window
const SCREEN_SIDE_MARGIN = 1.04;
// Room around a whole device on a phone, between the title and the drawer
const DEVICE_WHOLE_MARGIN = 1.1;

export function createFraming({ rig, screen, state, grid, ui }) {
    // Clear space kept under the project's title bar, as a share of the height
    const UNDER_BAR_GAP = 0.03;

    /**
     * A device with a screen (`screen`), framed by its own outline into the
     * band between the title bar and the drawer's handle (parked or pulled
     * out, stacked). `whole`: all of it, centred in that band, `margin` times
     * its height. Otherwise its screen as large as the band allows (see
     * frameDetail's `fillScreen`) - `margin` times the room from the device's
     * top down to the screen's bottom, its top just under the title. Its sides
     * always keep SCREEN_SIDE_MARGIN.
     */
    function frameDevice(model, mode, duration, ease, { margin, whole = false }) {
        const display = model.userData.screen;
        // As it will stand facing the visitor, not part-way through the turn
        // it makes while its film loads
        const spin = model.userData.screenSpin ?? 0;
        model.rotation.y -= spin;
        model.updateMatrixWorld(true);
        const centre = model.localToWorld(display.face.clone());
        const across = model.localToWorld(display.face.clone().add(display.u)).sub(centre);
        const upward = model.localToWorld(display.face.clone().add(display.v)).sub(centre);
        const out = across.clone().cross(upward).normalize();

        // How far the device itself reaches above and below the screen's
        // centre, and to either side of it
        const box = new THREE.Box3().setFromObject(model);
        const upUnit = upward.clone().normalize();
        const acrossUnit = across.clone().normalize();
        let top = upward.length();
        let bottom = -upward.length();
        let side = across.length();
        let front = 0;
        const corners = boxCorners(box).map((corner) => corner.sub(centre));
        corners.forEach((corner) => {
            top = Math.max(top, corner.dot(upUnit));
            if (whole) bottom = Math.min(bottom, corner.dot(upUnit));
            side = Math.max(side, Math.abs(corner.dot(acrossUnit)));
            front = Math.max(front, corner.dot(out));
        });
        model.rotation.y += spin;
        model.updateMatrixWorld(true);

        // The free band, as shares of the window's height: below the bar,
        // above the drawer's handle (and the drawer, when it's out)
        // - and, on a wide screen, left of the drawer when it's out
        const { fraction } = getPanelLayout(state.drawerOpen);
        const below = Math.min(ui.barFraction() + UNDER_BAR_GAP, 0.5);
        const above = mode === 'side' ? 0
            : Math.min(fraction + ui.handleFraction() + UNDER_BAR_GAP, 0.8);
        const band = Math.max(1 - below - above, 0.15);
        const width = mode === 'side' ? 1 - fraction : 1;
        const tan = Math.tan(THREE.MathUtils.degToRad(DETAIL_FOV[mode]) / 2);
        // (whole, from the device's front - a laptop's keyboard comes out
        // towards the camera, and nearer looks larger)
        const distance = Math.max(
            margin * (top - bottom) / (2 * band * tan),
            whole ? 0 : margin * across.length() / (tan * screen.aspect * width),
            SCREEN_SIDE_MARGIN * side / (tan * screen.aspect * width),
        ) + (whole ? front : 0);

        // All of it centred in the free space, as its corners land on the
        // screen - nearer ones land further out - or its top at the band's top
        let raise = whole
            ? (top + bottom) / 2 - (above - below) * distance * tan
            : top - (1 - 2 * below) * distance * tan;
        let shift = (1 - width) * distance * tan * screen.aspect;
        for (let pass = 0; whole && pass < 3; pass++) {
            let low = Infinity, high = -Infinity, left = Infinity, right = -Infinity;
            corners.forEach((corner) => {
                const depth = (distance - corner.dot(out)) * tan;
                const y = (corner.dot(upUnit) - raise) / depth;
                const x = (corner.dot(acrossUnit) - shift) / (depth * screen.aspect);
                low = Math.min(low, y); high = Math.max(high, y);
                left = Math.min(left, x); right = Math.max(right, x);
            });
            raise += ((low + high) / 2 - (above - below)) * distance * tan;
            shift += ((left + right) / 2 + (1 - width)) * distance * tan * screen.aspect;
        }
        const target = centre.clone().addScaledVector(upUnit, raise).addScaledVector(acrossUnit, shift);

        rig.animateFov(DETAIL_FOV[mode], duration);
        rig.moveCamera(target.clone().addScaledVector(out, distance), target, duration, ease);
    }

    let swayStartedAt = null; // elapsed time the current run began; null while held
    let swayApplied = 0; // radians currently applied on top of the camera's own place
    const swayOffset = new THREE.Vector3();
    const swayAxis = new THREE.Vector3();

    const framing = {
        /**
         * Move the camera back far enough to frame the whole grid.
         */
        fitToGrid({ animate = false } = {}) {
            const { perspectiveCamera, controls } = rig;
            const step = CUBE_SIZE * SPACING;

            // Grid extents, measured to the outer faces of the edge pebbles -
            // each as big as its pebble, so a large one on the edge stays on
            // screen
            let halfWidth = ((grid.shape.cols - 1) * step + CUBE_SIZE) / 2;
            let halfDepth = ((grid.shape.rows - 1) * step + CUBE_SIZE) / 2;
            grid.pebbles.forEach((pebble) => {
                const reach = CUBE_SIZE / 2 * pebble.userData.size;
                halfWidth = Math.max(halfWidth, Math.abs(pebble.userData.slotPosition.x) + reach);
                halfDepth = Math.max(halfDepth, Math.abs(pebble.userData.slotPosition.z) + reach);
            });
            const gridWidth = halfWidth * 2;
            const gridDepth = halfDepth * 2;

            const halfFov = THREE.MathUtils.degToRad(CATALOG_FOV) / 2;
            const distanceForDepth = (gridDepth * GRID_MARGIN) / 2 / Math.tan(halfFov);
            const distanceForWidth = (gridWidth * GRID_MARGIN) / 2 / (Math.tan(halfFov) * perspectiveCamera.aspect);

            // Clear the highest point a pebble reaches while it bobs
            const pebbleTop = CUBE_SIZE / 2 + 3;
            const height = Math.max(distanceForDepth, distanceForWidth) + pebbleTop;
            // How high the camera sits over the grid, for the filter's sink
            // (pebbles/focus.js) to make a pebble look a set share smaller
            grid.viewHeight = height;

            // How big a pebble looks, for the words on and under it to scale
            // with (see .cube-tag in styles.css) - so a wide screen's bigger
            // pebbles get bigger names, and a phone's stay as they are
            const pixelsPerUnit = screen.height / (2 * height * Math.tan(halfFov));
            document.documentElement.style.setProperty('--pebble-px', `${(PEBBLE_RADIUS * pixelsPerUnit).toFixed(1)}px`);

            // Position the camera above the grid, looking straight down at its centre
            perspectiveCamera.up.set(0, 1, 0);
            perspectiveCamera.updateProjectionMatrix();

            if (animate) {
                rig.moveCamera(new THREE.Vector3(0, height, 0), new THREE.Vector3(0, 0, 0), 1.1);
                return;
            }

            perspectiveCamera.position.set(0, height, 0);
            perspectiveCamera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);
            controls.update();
        },

        /**
         * Frame a project for the detail view.
         *
         * By default the camera sits square-on to the pebble, looking along
         * -Z, so its vertical and horizontal edges stay parallel to the
         * canvas - a one-point view. A project can ask for its own angle
         * instead through `view`.
         */
        frameDetail(object, { duration = 1.6, ease, fit, fitZoom, toCamera: from } = {}) {
            const { camera, controls } = rig;
            state.detailZoomed = false;

            /**
             * A project with its own view is framed on the pebble alone. Seen
             * from above at an angle, the bounding box of the model's
             * scattered points balloons and changes size as the model turns;
             * the pebble is the frame the shot is composed around, and stray
             * points running off the edges read fine.
             */
            const framesCube = Boolean(object.userData.project?.view);

            /**
             * A project's view can come in closer than the pebble's fit
             * (`zoom`), so the pebble runs off the edges and the model fills
             * the screen, and be nudged up the screen (`lift`, a share of the
             * screen's height). Either can be one number, or
             * { side, stacked } per layout. Not with the drawer open on a
             * narrow screen, which has its own close-up; beside a drawer on a
             * wide one it keeps its view, framed into the space left.
             */
            const { mode, fraction } = getPanelLayout(state.drawerOpen);
            const side = mode === 'side';

            /**
             * `view.fillScreen`: once it's time (detail's maybeFillScreen),
             * the camera looks square-on at the model's screen (`screen`),
             * close enough that its edges nearly meet the window's - the
             * whole film, as large as it goes with the device's own edges
             * still in view (a number: how much room to leave, 1 for none).
             * Not with the drawer out, which takes its usual frame.
             */
            const shown = object.userData.detail;
            const fill = object.userData.project?.view?.fillScreen;
            if (fill && shown?.userData.screenFilled && !state.drawerOpen && !fit) {
                frameDevice(shown, mode, duration, ease, { margin: fill === true ? 1 : fill });
                return;
            }
            // On a phone, a device is framed by its own outline, clear of the
            // title and the drawer's handle - the pebble's `zoom` and `lift`
            // can't know a short screen from a tall one
            if (shown?.userData.screen && !side && !state.drawerOpen && !fit) {
                frameDevice(shown, mode, duration, ease, { margin: DEVICE_WHOLE_MARGIN, whole: true });
                return;
            }
            // Or framed on a box of its own (`fit`, world space) - a pile's
            // aggregates with the drawer open - at the plain fit, no zoom or lift
            // (a view's `flight` first shot until its pull out: `flightStart`)
            const project = object.userData.flightStart
                ? { ...object.userData.project, view: { ...object.userData.project.view, ...object.userData.project.view.flight.from } }
                : object.userData.project;
            const ownView = framesCube && !fit && (!state.drawerOpen || side)
                ? project.view
                : {};
            const box = fit?.clone() ?? (framesCube
                ? new THREE.Box3().setFromCenterAndSize(object.position, new THREE.Vector3().setScalar(CUBE_SIZE))
                : new THREE.Box3().setFromObject(object));
            if (box.isEmpty()) return;

            const center = box.getCenter(new THREE.Vector3());
            const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);

            // (or from a way of its own, `toCamera` - onto a section)
            const toCamera = from ?? viewDirection(project);
            const forward = toCamera.clone().negate();
            const right = forward.clone().cross(camera.up).normalize();
            const up = right.clone().cross(forward).normalize();

            // The box's extent as it projects onto the screen axes, plus its
            // depth along the view axis - under perspective the near face
            // projects larger than the centre, so the fit has to allow for it
            const halfW = halfExtentAlong(right, half);
            const halfH = halfExtentAlong(up, half);
            const halfD = halfExtentAlong(forward, half);

            const zoom = perLayout(fit ? fitZoom : ownView.zoom, 1, mode);
            const lift = perLayout(ownView.lift, 0, mode);
            let margin = side
                ? DETAIL_MARGIN.side
                : (state.drawerOpen ? DETAIL_MARGIN.stackedOpen : DETAIL_MARGIN.stackedParked);

            // DETAIL_MARGIN was tuned against the whole model's box, scatter
            // and all; the pebble alone wants its own
            if (framesCube) margin = VIEW_FRAME_MARGIN;

            /**
             * What is left of the viewport once the bar and the drawer have
             * taken their share: the drawer eats width side-by-side and
             * height stacked, and the bar eats height off the top.
             */
            const barShare = side ? 0 : ui.barFraction();
            const freeW = side ? 1 - fraction : 1;
            const freeH = Math.max(1 - barShare - (side ? 0 : fraction), 0.15);

            const ortho = DETAIL_PROJECTION === 'orthographic';
            const tan = Math.tan(THREE.MathUtils.degToRad(DETAIL_FOV[mode]) / 2);

            let distance;
            let halfHeight;

            if (ortho) {
                // Nothing converges, so the fit is just the projected extent
                const neededH = (halfH * margin) / freeH;
                const neededW = (halfW * margin) / (screen.aspect * freeW);

                halfHeight = Math.max(neededH, neededW);
                distance = ORTHO_VIEW_DISTANCE;
            } else {
                // Keep the nearest face inside the free area, not just the centre
                const forWidth = (halfD + halfW / (tan * screen.aspect)) / freeW;
                const forHeight = (halfD + halfH / tan) / freeH;

                distance = margin * Math.max(forWidth, forHeight) / zoom;
                halfHeight = distance * tan;
            }

            /**
             * Where the model should sit, in normalised screen coordinates:
             * pushed away from whichever edges are spoken for. Moving the
             * camera the opposite way puts it there.
             */
            const ndcX = side ? -fraction : 0;
            let ndcY = (side ? 0 : fraction) - barShare;

            // A pebble-framed view sits centred on the screen when its top
            // already clears the bar there, and only drops as far as it has
            // to otherwise - centring it in the space below the bar leaves it
            // low on a tall phone
            if (framesCube && !ortho && !side && !state.drawerOpen && zoom === 1) {
                // Highest point of the pebble on screen, from its actual corners
                const eye = center.clone().addScaledVector(toCamera, distance);
                let top = -Infinity;
                boxCorners(box).forEach((corner) => {
                    const v = corner.sub(eye);
                    top = Math.max(top, v.dot(up) / (v.dot(forward) * tan));
                });
                ndcY = -Math.min(barShare, Math.max(0, top - (1 - 2 * barShare)));
            }

            ndcY += 2 * lift;

            const offset = right.clone().multiplyScalar(-ndcX * halfHeight * screen.aspect)
                .add(up.clone().multiplyScalar(-ndcY * halfHeight));

            const position = center.clone().addScaledVector(toCamera, distance).add(offset);
            const target = center.clone().add(offset);

            if (!ortho) rig.animateFov(DETAIL_FOV[mode], duration);

            rig.moveCamera(position, target, duration, ease);

            if (ortho) {
                const frustum = { halfHeight: rig.orthoHalfHeight };
                gsap.to(frustum, {
                    halfHeight,
                    duration,
                    ease: 'power2.inOut',
                    onUpdate: () => rig.setOrthoFrustum(frustum.halfHeight),
                });
            }
        },

        /**
         * Onto the model's section at `share` (as `setSection` takes it),
         * from the side cut away - square-on, or `side` degrees round and
         * `above` degrees down - centred on the part named `focus` where the
         * cut passes through it, `reach` of the parts' breadth
         * across the window: where the camera would be, { position, target }
         * (nothing without a section or that part) - a `tour` places it there
         * frame by frame.
         */
        frameSection(model, { focus, share, aim = share, reach, side = 0, above = 0 }) {
            const section = model.userData.section;
            if (!section) return;

            // (the parts, measured once as the section was made - not the floor)
            const { box: all, meshes } = section;
            const part = meshes.find((mesh) => mesh.name === focus);
            if (!part) return;

            // Aimed at the part where it's cut at `aim` - its outline there -
            // or, past its ends, at the middle of the part, then along to the
            // cut at `share`. A tour aims where it will end: aimed where the
            // moving cut is, the outline gains and loses pieces (a plate, a
            // hole) and the camera jumped with its middle.
            const z = sectionAt(section, share);
            const centre = part.geometry.boundingBox.getCenter(new THREE.Vector3());
            const cut = traceCut([part], sectionAt(section, aim));
            if (cut.length) centre.copy(new THREE.Box3().setFromPoints(cut).getCenter(new THREE.Vector3()));
            model.updateMatrixWorld(true);
            const target = model.localToWorld(new THREE.Vector3(centre.x, centre.y, z));
            const along = model.localToWorld(new THREE.Vector3(centre.x, centre.y, z + section.sign)).sub(target).normalize();
            const breadth = model.localToWorld(new THREE.Vector3(all.max.x, 0, 0))
                .distanceTo(model.localToWorld(new THREE.Vector3(all.min.x, 0, 0)));

            const toward = towardSection(along, side, above);

            const tan = Math.tan(THREE.MathUtils.degToRad(rig.perspectiveCamera.fov) / 2);
            const distance = (reach * breadth) / 2 / (tan * screen.aspect);
            const position = target.clone().addScaledVector(toward, -distance);
            return { position, target };
        },

        /**
         * The frame while the drawer is open. On a wide screen the drawer sits
         * beside the model, so the whole piece is framed into the space to its
         * left (frameDetail already fits into whatever the drawer leaves
         * free). On a narrow one it covers the lower half, and the close-up is
         * what fits - unless the project wants the whole model above it
         * (`view.drawer: 'whole'`).
         */
        frameWithDrawerOpen(pebble, options) {
            // A pile: in on the aggregates themselves, beside the drawer or
            // above it, rather than the whole surface they landed on
            const pile = pebble.userData.detail?.userData.pile;
            if (pile) {
                framing.frameDetail(pebble, { ...options, fit: pile.bounds(), fitZoom: PILE_DRAWER_ZOOM });
                return;
            }

            // The whole model, fitted to its own outline rather than the pebble's -
            // stacked, a little further back, clear of the drawer's handle
            const side = getPanelLayout(state.drawerOpen).mode === 'side';
            const model = pebble.userData.detail;
            // A device stays square-on, its screen parallel to the window's
            if (pebble.userData.project?.view?.drawer === 'whole' && model?.userData.screen) {
                frameDevice(model, side ? 'side' : 'stacked', options?.duration ?? 1.6, options?.ease, { margin: DEVICE_WHOLE_MARGIN, whole: true });
                return;
            }
            // A section (`view.drawer: { side, above }`): the part kept, seen
            // from where it's cut, at those angles
            if (framing.frameOnSection(pebble, options)) return;
            if (pebble.userData.project?.view?.drawer === 'whole' && model) {
                framing.frameDetail(pebble, { ...options, fit: new THREE.Box3().setFromObject(model), fitZoom: side ? 1 : WHOLE_ABOVE_DRAWER_ZOOM });
                return;
            }

            if (side) {
                framing.frameDetail(pebble, options);
            } else {
                framing.frameCloseup(pebble, options);
            }
        },

        frameCloseup(pebble, { duration = 1.1 } = {}) {
            state.detailZoomed = false;

            const model = pebble.userData.detail;
            if (!model) return;

            const box = new THREE.Box3().setFromObject(model);
            if (box.isEmpty()) return;

            const center = box.getCenter(new THREE.Vector3());
            const radius = box.getSize(new THREE.Vector3()).length() / 2;

            // The project's own heading, from CLOSEUP_ELEVATION above. Any
            // steeper and on a phone the strip left above the drawer holds
            // only fragments
            const dir = viewDirection(pebble.userData.project, { elevation: CLOSEUP_ELEVATION });
            const position = center.clone().addScaledVector(dir, radius * CLOSEUP_DISTANCE_FACTOR);

            rig.moveCamera(position, center, duration);
        },

        /**
         * `view.drawer: { side, above, zoom }` with a `section`: the part the
         * section keeps, seen from where it's cut at those angles, fitted
         * into whatever the drawer leaves. False for any other project.
         */
        frameOnSection(pebble, options, zoom) {
            const onSection = pebble.userData.project?.view?.drawer;
            const model = pebble.userData.detail;
            if (onSection?.side === undefined || !model?.userData.section) return false;
            const { box: parts, clip, sign } = model.userData.section;
            const kept = parts.clone();
            if (sign > 0) kept.min.z = Math.max(kept.min.z, clip.value);
            else kept.max.z = Math.min(kept.max.z, -clip.value);
            model.updateMatrixWorld(true);
            const along = new THREE.Vector3(0, 0, sign).transformDirection(model.matrixWorld);
            const toCamera = towardSection(along, onSection.side, onSection.above ?? 0).negate();
            framing.frameDetail(pebble, { ...options, fit: kept.applyMatrix4(model.matrixWorld), fitZoom: zoom ?? onSection.zoom ?? 1, toCamera });
            return true;
        },

        // The drawer pushed back: the full-fit view - or, with `view.drawer:
        // { stay: { zoom } }`, its view onto the section kept, on the whole
        // canvas, `zoom` times closer than its fit there
        frameDrawerClosed(pebble, options) {
            const stay = pebble.userData.project?.view?.drawer?.stay;
            if (stay && framing.frameOnSection(pebble, options, stay.zoom ?? 1)) return;
            framing.frameDetail(pebble, options);
        },

        // Whichever frame the project is currently meant to be in
        reframe(pebble, options) {
            if (state.drawerOpen) {
                framing.frameWithDrawerOpen(pebble, options);
            } else {
                framing.frameDetail(pebble, options);
            }
        },

        // `held`: the model's turn is held still, and the nod holds with it
        updateSway(project, since, elapsedTime, held = false) {
            const { camera, controls } = rig;
            const amplitude = THREE.MathUtils.degToRad(project?.view?.sway ?? 0);
            const gathering = project?.gather && since < GATHER_DURATION;

            if (!amplitude || gathering || held || rig.orientationLocked || rig.visitorOrbiting || state.view !== 'detail') {
                swayStartedAt = null;
                return;
            }

            if (swayStartedAt === null) {
                swayStartedAt = elapsedTime;
                swayApplied = 0;
            }

            const t = elapsedTime - swayStartedAt;
            const angle = amplitude * smooth01(t / SWAY_EASE_IN) * Math.sin((t / SWAY_PERIOD) * Math.PI * 2);

            // Turn the camera about its own screen-right axis through the
            // target (negative raises it); controls.update() then re-aims it
            swayAxis.set(1, 0, 0).applyQuaternion(camera.quaternion);
            swayOffset.copy(camera.position).sub(controls.target).applyAxisAngle(swayAxis, -(angle - swayApplied));

            // Never over the top (or under): seen from straight above, a nod
            // tipped the camera past the pole, the controls flipped it round,
            // and it shook back and forth. Held at the edge instead, and
            // carried on once the nod turns back.
            const polar = swayOffset.angleTo(camera.up);
            if (polar < SWAY_POLE || polar > Math.PI - SWAY_POLE) return;

            camera.position.copy(controls.target).add(swayOffset);
            swayApplied = angle;
        },
    };

    return framing;
}
