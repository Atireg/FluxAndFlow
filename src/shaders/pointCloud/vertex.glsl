// uniform float uTime;
uniform sampler2D uPerlinTexture;
uniform float uPointScale;
uniform float uSizeAttenuation; // 1.0 perspective, 0.0 orthographic

// The gather's uniforms and attributes come from gather.glsl, put in front
// of this file in script.js

attribute float aScale;
attribute float aTone; // which of the inks this point is drawn in: 0, 1 or 2
// attribute vec3 color;

varying vec2 vUv;
// varying vec3 vColor;
varying float vArrived;
varying float vTone;

void main() {
        float arrived = gatherArrived(uGather);
        vec3 gathered = gatherPosition(position, arrived);
        vArrived = arrived;
        vTone = aTone;

        vec4 modelPosition = modelMatrix * vec4(gathered, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;

        gl_Position = projectedPosition;

        // A constant size in world space, whichever projection is in use.
        // uPointScale carries the pixels-per-world-unit from the JS side;
        // under perspective that has to be divided by depth, under
        // orthographic it does not.
        float depth = mix(1.0, max(-viewPosition.z, 0.001), uSizeAttenuation);
        gl_PointSize = (uPointScale * aScale) / depth;
        
        // Varying
        vUv = uv;
        // vColor = color;
    }