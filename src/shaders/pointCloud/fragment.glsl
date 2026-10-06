uniform sampler2D uPerlinTexture;
uniform vec3 uInkColor;

varying vec3 vNormal;
varying vec2 vUv;
varying float vArrived; // see the gather in vertex.glsl

void main() {
        // Disc
        float strength = distance(gl_PointCoord, vec2(0.5));
        strength = step(0.5, strength);
        strength = 1.0 - strength;

        // A little variation in how much ink each point lays down
        float grain = texture(uPerlinTexture, vUv).r;
        grain = smoothstep(1.0, 0.01, grain);

        // Ink over the paper ground: the colour stays the same, its weight
        // varies. Scattered points (the gather) are fainter and darken as
        // they arrive.
        float weight = mix(0.55, 0.9, grain) * mix(0.35, 1.0, vArrived);

        gl_FragColor = vec4(uInkColor, strength * weight);
    }
