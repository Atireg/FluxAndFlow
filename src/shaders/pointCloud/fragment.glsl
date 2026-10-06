uniform sampler2D uPerlinTexture;
uniform vec3 uInks[3]; // dark red, orange, grey - POINT_INKS in script.js
uniform float uOpacity; // the most ink a point lays down - POINT_OPACITY

varying vec3 vNormal;
varying vec2 vUv;
varying float vArrived; // see the gather in vertex.glsl
varying float vTone; // which ink, picked at random per point

void main() {
        // Disc
        float strength = distance(gl_PointCoord, vec2(0.5));
        strength = step(0.5, strength);
        strength = 1.0 - strength;

        // A little variation in how much ink each point lays down
        float grain = texture(uPerlinTexture, vUv).r;
        grain = smoothstep(1.0, 0.01, grain);

        // Ink over the paper ground, each point in its own ink, with a weight
        // that varies. Scattered points (the gather) are fainter and darken
        // as they arrive.
        float weight = mix(0.55, 0.9, grain) * mix(0.35, 1.0, vArrived) * uOpacity;

        vec3 ink = vTone < 0.5 ? uInks[0] : (vTone < 1.5 ? uInks[1] : uInks[2]);

        gl_FragColor = vec4(ink, strength * weight);
    }
