import * as THREE from 'three';
import smokeVertexShader from './shaders/smoke/vertex.glsl';
import smokeFragmentShader from './shaders/smoke/fragment.glsl';

/**
 * A drifting smoke plane, left over from the experiment this project grew
 * out of. NOTHING ADDS IT TO THE SCENE: it is kept, with its shaders, for
 * the "magic/mystery appearance (fog shader or lights)" idea in README's
 * TODO list - the grey fog in the project view is a CSS layer instead, and
 * scene fog is off for a reason (see DECISIONS.md).
 *
 * Call it and add the mesh to the scene to bring it back; its uTime uniform
 * then needs setting each frame.
 */
export function createSmoke(perlinTexture) {
    const geometry = new THREE.PlaneGeometry(20, 20, 32, 64);
    geometry.rotateX(Math.PI / 2);

    const material = new THREE.ShaderMaterial({
        vertexShader: smokeVertexShader,
        fragmentShader: smokeFragmentShader,
        uniforms: {
            uTime: new THREE.Uniform(0),
            uPerlinTexture: new THREE.Uniform(perlinTexture),
        },
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
    });

    return { mesh: new THREE.Mesh(geometry, material), material };
}
