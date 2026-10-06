// uniform float uTime;
uniform sampler2D uPerlinTexture;
uniform float uPointScale;
uniform float uSizeAttenuation; // 1.0 perspective, 0.0 orthographic

// The gather: 0 = every point out at its scattered position, 1 = all home.
// A cloud without the gather attributes reads them as 0 and leaves this at
// 1, which puts every point at its own position - no gather at all.
uniform float uGather;
uniform float uGatherSpread; // the latest any point starts, as a share of the gather
uniform float uGatherSwirl; // radians the scatter turns through on the way in

attribute float aScale;
attribute vec3 aScatter; // where this point starts, in the cloud's own space
attribute float aGatherDelay; // 0..1, when it sets off within the spread
// attribute vec3 color;

varying vec2 vUv;
// varying vec3 vColor;
varying vec3 vNormal;
varying float vArrived;

void main() {
        // Each point sets off at its own moment and eases home, settling
        // gently rather than stopping dead
        float t = clamp((uGather - aGatherDelay * uGatherSpread) / (1.0 - uGatherSpread), 0.0, 1.0);
        float arrived = 1.0 - pow(1.0 - t, 3.0);

        // The scatter swirls round the vertical axis as it closes in, so the
        // points spiral in like a current rather than flying straight home
        float angle = (1.0 - arrived) * uGatherSwirl;
        vec3 scatter = aScatter;
        scatter.xz = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * scatter.xz;

        vec3 gathered = mix(scatter, position, arrived);
        vArrived = arrived;

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