import { PEBBLE_RADIUS } from './constants.js';
import { halfHeightAt } from './camera/rig.js';
import { createStreams } from './streams.js';
import { isGone } from './pebbles/focus.js';

/**
 * The loader's streams, carried on among the pebbles (streams.js): they live
 * in the scene on the y = 0 plane, part round each pebble's circle and drift
 * towards the pointer while the mouse moves or a finger is down. They fade
 * out while a project is open.
 */
const STREAM_POINTER_IDLE = 0.35; // seconds after the mouse stops that they let go

export function createStreamsView({ scene, grid, state, rig }) {
    const streams = createStreams(scene);
    const pebbleCircles = [];
    const view = { x: 20, z: 20 };
    const wind = { x: 1, z: 0, on: false };

    // Where the pointer is on the streams' plane, for them to drift towards
    const pointer = { x: 0, z: 0, at: -Infinity, touching: false };

    return {
        takeOver: (points, speed) => streams.takeOver(points, speed),

        trackPointer(hit) {
            pointer.x = hit.x;
            pointer.z = hit.z;
            pointer.at = performance.now() / 1000;
        },

        setTouching(touching) {
            pointer.touching = touching;
        },

        update(dt, elapsedTime) {
            const show = state.view === 'catalog' || state.view === 'returning';

            // Round the pebbles on screen - not those the filter has faded out
            pebbleCircles.length = 0;
            grid.pebbles.forEach((pebble) => {
                if (isGone(pebble, elapsedTime)) return;
                pebbleCircles.push({
                    x: pebble.position.x,
                    z: pebble.position.z,
                    // its lumps and stretch reach a little past the radius
                    r: PEBBLE_RADIUS * pebble.userData.size * pebble.scale.x * 1.1,
                });
            });

            // The plane the overhead camera sees, so streams fill the screen
            let seen = null;
            if (show && rig.camera === rig.perspectiveCamera) {
                const halfZ = halfHeightAt(rig.perspectiveCamera.fov, Math.abs(rig.perspectiveCamera.position.y));
                view.z = halfZ;
                view.x = halfZ * rig.perspectiveCamera.aspect;
                seen = view;
            }

            const moving = performance.now() / 1000 - pointer.at < STREAM_POINTER_IDLE;
            const pull = state.view === 'catalog' && (moving || pointer.touching) ? pointer : null;

            // The page's wind blows to the screen's right, on the streams' plane
            const camera = rig.camera.matrixWorld.elements;
            const across = Math.hypot(camera[0], camera[2]) || 1;
            wind.x = camera[0] / across;
            wind.z = camera[2] / across;
            wind.on = state.wind;

            streams.update(
                dt,
                elapsedTime,
                pebbleCircles,
                seen,
                show && state.arrivalStartedAt <= elapsedTime,
                pull,
                wind,
            );
        },
    };
}
