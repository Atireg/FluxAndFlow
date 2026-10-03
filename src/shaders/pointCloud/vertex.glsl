// uniform float uTime;
uniform sampler2D uPerlinTexture;
uniform float uPointSize;

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

        gl_PointSize = uPointSize * aScale;
        gl_PointSize *= (aScale / -viewPosition.z);
        
        // Varying
        vUv = uv;
        // vColor = color;
    }