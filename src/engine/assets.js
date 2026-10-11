import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Paths are stored without a leading slash and resolved against Vite's base
 * URL, so they keep working if the site is served from a sub-path. Never
 * hardcode a leading '/' on an asset path.
 */
export const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`;

export const textureLoader = new THREE.TextureLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(assetUrl('draco/'));

export const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
