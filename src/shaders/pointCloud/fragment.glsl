uniform sampler2D uPerlinTexture;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;

varying vec3 vNormal;
// varying vec3 vColor;
varying vec2 vUv;
varying float vArrived; // see the gather in vertex.glsl

void main() {
        // Disc
        float strength = distance(gl_PointCoord, vec2(0.5));
        strength = step(0.5, strength);
        strength = 1.0 - strength;
        // strength = pow(strength, 100.0);

        // Apply texture
        vec2 colorUv = vUv;
        float color = texture(uPerlinTexture, colorUv).r;

        // Remap
        color = smoothstep(1.0, 0.01, color);

        // Absorb light
        vec3 normal = normalize(vNormal);

        // Calculate the diffuse light intensity (Lambertian reflection)
        float diffuse = max(dot(normal, -uLightDirection), 1.0);

        // Absorb some of the light (e.g., by reducing the diffuse intensity)
        float absorbedLight = diffuse * 0.5; // Absorb 50% of the light

        // Combine the absorbed light with the material's color
        vec3 finalColor = color * uLightColor * absorbedLight;

        // Scattered points glow faintly and brighten as they arrive
        finalColor *= mix(0.6, 1.0, vArrived);

        gl_FragColor = vec4(vec3(finalColor), strength);

        // #include <tonemapping_fragment>
        // #include <colorspace_fragment>

    }