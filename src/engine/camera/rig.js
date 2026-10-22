import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';

/**
 * Two cameras, two fields of view.
 *
 * The catalog is perspective, so the pebbles read as solids with depth. A
 * project is shown one-point: the camera sits square-on to the pebble, so
 * its vertical and horizontal edges stay parallel to the canvas while depth
 * converges on a single vanishing point.
 *
 * A phone's frame is narrow enough that a wide angle shows the pebble's top
 * and bottom faces receding at once, which reads as a tunnel rather than a
 * box, so it gets a longer lens than the desktop layout does.
 */
export const CATALOG_FOV = 45;

// Half the height a perspective lens of `fov` degrees sees, `distance` away
export function halfHeightAt(fov, distance) {
    return distance * Math.tan(THREE.MathUtils.degToRad(fov) / 2);
}

// Device pixels per CSS pixel, drawn at no more than 2 - a phone's 3x costs
// more than it shows
export function pixelRatio() {
    return Math.min(window.devicePixelRatio || 1, 2);
}

export const DETAIL_FOV = { side: 45, stacked: 30 };

/**
 * Which projection a project is shown in.
 *
 *   'perspective'  one-point perspective - DETAIL_FOV sets how strong the
 *                  convergence is: lower is flatter, higher more dramatic.
 *   'orthographic' no convergence at all, everything true to scale.
 */
export const DETAIL_PROJECTION = 'perspective';

const ORTHO_VIEW_DISTANCE = 50; // orthographic ignores distance; this just clears the scene
export { ORTHO_VIEW_DISTANCE };

// Point clouds keep a constant size in world units under either projection
const POINT_WORLD_SIZE = 0.022;

export function createCameraRig({ canvas, scene, screen, onShaderError }) {
    const perspectiveCamera = new THREE.PerspectiveCamera(CATALOG_FOV, screen.aspect, 1, 2000);

    // near is negative so the frustum reaches behind the camera and nothing
    // clips as it is moved around
    const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 4000);

    scene.add(perspectiveCamera, orthographicCamera);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, stencil: true }); // (stencil: a section's fill)
    renderer.setSize(screen.width, screen.height);
    renderer.setPixelRatio(pixelRatio());

    // A shader that won't compile draws nothing at all, silently. Say so in
    // the project bar, and keep the compiler's message for the console.
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
        const logs = [program, vertexShader, fragmentShader]
            .map((item) => (item === program ? gl.getProgramInfoLog(item) : gl.getShaderInfoLog(item)))
            .filter(Boolean);
        console.error('Shader error', ...logs);
        onShaderError?.();
    };

    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const controls = new OrbitControls(perspectiveCamera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    /**
     * The grid of all projects holds still under the visitor's hand -
     * dragging across it stirs the pebbles instead (see the flow). Orbiting
     * is only switched on inside a project. update() still runs either way:
     * `enabled` only gates input, and moveCamera relies on update() to
     * resync.
     */
    controls.enabled = false;

    // True while the visitor is orbiting by hand - the camera's sway holds off
    let visitorOrbiting = false;
    controls.addEventListener('start', () => { visitorOrbiting = true; });
    controls.addEventListener('end', () => { visitorOrbiting = false; });

    // Whether the camera's orientation is being driven directly by moveCamera
    // rather than left for OrbitControls to re-derive from position each frame
    let orientationLocked = false;
    const orientation = { t: 0 };

    const pointMaterials = [];
    let orthoHalfHeight = 1; // half the height of the orthographic frustum, in world units

    const rig = {
        renderer,
        baseNear: perspectiveCamera.near, // detail.js lowers it while standing inside a model
        controls,
        perspectiveCamera,
        orthographicCamera,
        camera: perspectiveCamera,

        get orthoHalfHeight() {
            return orthoHalfHeight;
        },

        get orientationLocked() {
            return orientationLocked;
        },

        get visitorOrbiting() {
            return visitorOrbiting;
        },

        // A point cloud's material joins the set whose size follows the lens
        registerPointMaterial(material) {
            pointMaterials.push(material);
            rig.refreshPointScale();
        },

        framebufferHeight() {
            return screen.height * renderer.getPixelRatio();
        },

        // Where a world point lands on screen, in pixels from the top left.
        // Projects `vector` in place.
        toScreen(vector) {
            vector.project(rig.camera);
            return [(vector.x + 1) / 2 * screen.width, (1 - vector.y) / 2 * screen.height];
        },

        // A pointer's position as the camera's -1..1 coordinates, into `out`
        pointerToNdc(clientX, clientY, out) {
            return out.set((clientX / screen.width) * 2 - 1, -(clientY / screen.height) * 2 + 1);
        },

        /**
         * Pixels per world unit at the plane being looked at, which is what
         * turns a world-space point size into a pixel size.
         */
        setPointScale(pixelsPerUnit, attenuate) {
            pointMaterials.forEach((material) => {
                material.uniforms.uPointScale.value = POINT_WORLD_SIZE * pixelsPerUnit;
                material.uniforms.uSizeAttenuation.value = attenuate ? 1 : 0;
            });
        },

        refreshPointScale() {
            if (rig.camera === orthographicCamera) {
                rig.setOrthoFrustum(orthoHalfHeight);
                return;
            }

            rig.setPerspectivePointScale();
        },

        setPerspectivePointScale() {
            const halfFov = THREE.MathUtils.degToRad(perspectiveCamera.fov) / 2;
            rig.setPointScale(rig.framebufferHeight() / (2 * Math.tan(halfFov)), true);
        },

        setOrthoFrustum(halfHeight) {
            orthoHalfHeight = Math.max(halfHeight, 0.001);

            const halfWidth = orthoHalfHeight * screen.aspect;
            orthographicCamera.left = -halfWidth;
            orthographicCamera.right = halfWidth;
            orthographicCamera.top = orthoHalfHeight;
            orthographicCamera.bottom = -orthoHalfHeight;
            orthographicCamera.updateProjectionMatrix();

            rig.setPointScale(rig.framebufferHeight() / (2 * orthoHalfHeight), false);
        },

        setActiveCamera(next) {
            rig.camera = next;
            controls.object = next;
            controls.update();
        },

        /**
         * Every animated camera move goes through here. Position and target
         * tween as usual; orientation slerps from where it is to exactly
         * where lookAt would leave it at the end, instead of OrbitControls
         * re-deriving it from position every frame. Re-deriving breaks at the
         * catalog's overhead pole, where the heading is undefined and snaps
         * to whatever a near-zero offset implies.
         *
         * A move still in flight is cancelled first. Left running, a longer
         * one (opening, 1.6s) outlasts a shorter one started after it
         * (closing, 1.1s) and drags the camera back towards where it was
         * heading.
         */
        // Straight there this frame, no tween - for a camera driven frame by frame
        placeCamera(position, target) {
            const camera = rig.camera;
            gsap.killTweensOf([camera.position, controls.target, orientation]);
            orientationLocked = false;
            camera.position.copy(position);
            controls.target.copy(target);
            camera.lookAt(target);
            controls.update();
        },

        moveCamera(position, target, duration, ease = 'power2.inOut') {
            const camera = rig.camera;
            gsap.killTweensOf([camera.position, controls.target, orientation]);

            const fromQuat = camera.quaternion.clone();
            const toQuat = new THREE.Quaternion().setFromRotationMatrix(
                new THREE.Matrix4().lookAt(position, target, camera.up)
            );

            orientationLocked = true;

            gsap.to(camera.position, { x: position.x, y: position.y, z: position.z, duration, ease });
            gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration, ease });

            // Created last so it completes after position and target have
            // landed, and controls.update() resyncs from the final values
            orientation.t = 0;
            gsap.to(orientation, {
                t: 1,
                duration,
                ease,
                onUpdate: () => camera.quaternion.slerpQuaternions(fromQuat, toQuat, orientation.t),
                onComplete: () => {
                    orientationLocked = false;
                    controls.update();
                },
            });
        },

        /**
         * Changing the field of view changes how strongly depth converges, so
         * the catalog and a project can each have their own lens.
         */
        animateFov(fov, duration) {
            // Same reason as moveCamera: an older, longer lens change would
            // otherwise outlast this one and leave the wrong lens behind
            gsap.killTweensOf(perspectiveCamera, 'fov');

            gsap.to(perspectiveCamera, {
                fov,
                duration,
                ease: 'power2.inOut',
                onUpdate: () => {
                    perspectiveCamera.updateProjectionMatrix();
                    rig.setPerspectivePointScale();
                },
            });
        },

        enterDetailProjection() {
            // Under perspective there is nothing to switch; framing sets the lens
            if (DETAIL_PROJECTION === 'orthographic') swapToOrthographic();
        },

        exitDetailProjection(duration) {
            if (DETAIL_PROJECTION === 'orthographic') swapToPerspective();

            rig.animateFov(CATALOG_FOV, duration);
        },

        resize() {
            // Update both cameras; only one of them is active at a time
            perspectiveCamera.aspect = screen.aspect;
            perspectiveCamera.updateProjectionMatrix();
            rig.setOrthoFrustum(orthoHalfHeight);
            rig.refreshPointScale();

            renderer.setSize(screen.width, screen.height);
            renderer.setPixelRatio(pixelRatio());
        },

        render() {
            renderer.render(scene, rig.camera);
        },
    };

    /**
     * Switching projection is a cut, so start the incoming camera matched to
     * what the outgoing one was showing and the scale does not jump.
     */
    function swapToOrthographic() {
        const distance = perspectiveCamera.position.distanceTo(controls.target);
        const halfHeight = halfHeightAt(perspectiveCamera.fov, distance);

        orthographicCamera.position.copy(perspectiveCamera.position);
        orthographicCamera.quaternion.copy(perspectiveCamera.quaternion);
        rig.setOrthoFrustum(halfHeight);
        rig.setActiveCamera(orthographicCamera);
    }

    function swapToPerspective() {
        perspectiveCamera.fov = CATALOG_FOV;
        perspectiveCamera.updateProjectionMatrix();

        const direction = orthographicCamera.position.clone().sub(controls.target);
        const distance = orthoHalfHeight / halfHeightAt(CATALOG_FOV, 1);

        if (direction.lengthSq() > 0) {
            perspectiveCamera.position.copy(controls.target).addScaledVector(direction.normalize(), distance);
        }

        perspectiveCamera.quaternion.copy(orthographicCamera.quaternion);
        rig.setActiveCamera(perspectiveCamera);
    }

    return rig;
}
