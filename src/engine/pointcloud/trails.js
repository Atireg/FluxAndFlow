import * as THREE from 'three';

/**
 * Tails: every point on its way somewhere - gathering into a model, or
 * flying out of a clicked pebble and falling into a ground - draws a tail
 * back to where it was a moment ago (../shaders/trail/). Both motions are
 * pure functions of one progress uniform, so a tail just asks the same
 * function about a moment earlier: nothing is stored from frame to frame. A
 * tail shrinks to nothing as its point slows into place, and the tails are
 * switched off once the motion is over. One quad per point, drawn instanced
 * under the points.
 *
 * Change how a point moves in pointCloud/gather.glsl or DISSOLVE_GLSL and
 * the tails follow.
 */
const TRAIL_OPACITY = 0.6; // a tail's ink at its head, as a share of its point's

// The drawing buffer, set each frame by the render loop
export const trailResolution = { value: new THREE.Vector2(1, 1) };

/**
 * Tails for a cloud of points: its own attributes (`names`) per instance,
 * its place as aHome, and the uniforms it shares with the points - the same
 * objects, so whatever drives the points drives the tails. `every` gives
 * only every that-many'th point a tail: each is a quad working the motion
 * out twice, so a big cloud's tails cost more to draw than its points.
 */
export function addTrails(points, { vertexShader, fragmentShader, names, lag, every = 1 }) {
    const source = points.geometry;
    const home = source.attributes.position;
    const count = Math.ceil(home.count / every);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);

    // Read out as floats, whatever the cloud is stored in (quantized)
    const homes = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        homes[i * 3] = home.getX(i * every);
        homes[i * 3 + 1] = home.getY(i * every);
        homes[i * 3 + 2] = home.getZ(i * every);
    }
    geometry.setAttribute('aHome', new THREE.InstancedBufferAttribute(homes, 3));
    names.forEach((name) => {
        const { array, itemSize, normalized } = source.attributes[name];
        const picked = every === 1 ? array : new array.constructor(count * itemSize);
        if (every !== 1) {
            for (let i = 0; i < count; i++) {
                for (let k = 0; k < itemSize; k++) picked[i * itemSize + k] = array[i * every * itemSize + k];
            }
        }
        geometry.setAttribute(name, new THREE.InstancedBufferAttribute(picked, itemSize, normalized));
    });
    geometry.instanceCount = count;

    // The cloud's own extent, not the quad's, for anything framing the model
    if (!source.boundingBox) source.computeBoundingBox();
    if (!source.boundingSphere) source.computeBoundingSphere();
    geometry.boundingBox = source.boundingBox.clone();
    geometry.boundingSphere = source.boundingSphere.clone();

    const trails = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: points.material.depthTest,
        vertexShader,
        fragmentShader,
        uniforms: {
            ...points.material.uniforms,
            uResolution: trailResolution,
            uTrailLag: { value: lag },
            uTrailOpacity: { value: TRAIL_OPACITY },
        },
    }));
    trails.frustumCulled = false; // it moves in the shader
    trails.raycast = () => {}; // never something to click on
    trails.renderOrder = points.renderOrder - 1; // under the points
    trails.visible = false;
    points.add(trails);
    return trails;
}
