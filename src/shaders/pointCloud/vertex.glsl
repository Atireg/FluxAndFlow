// uniform float uTime;
uniform sampler2D uPerlinTexture;
uniform float uPointScale;
uniform float uSizeAttenuation; // 1.0 perspective, 0.0 orthographic

attribute float aScale;
// attribute vec3 color;

varying vec2 vUv;
// varying vec3 vColor;
varying vec3 vNormal;

void main() {
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
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