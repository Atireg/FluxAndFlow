uniform float uTime;
uniform sampler2D uPerlinTexture;

varying vec2 vUv;

void main()
{
    //  Scale and animate
    vec2 smokeUv = vUv;
    smokeUv.x *= 3.0;
    smokeUv.y *= 3.0;
    smokeUv.y += uTime * 0.03;

    // Smoke
    float smoke = texture(uPerlinTexture, smokeUv).r;

    // Remap
    smoke = smoothstep(0.4, 1.0, smoke);

    // Edges
    smoke *= smoothstep(0.0, 0.2, vUv.x);
    smoke *= smoothstep(1.0, 0.2, vUv.x);
    smoke *= smoothstep(0.0, 0.2, vUv.y);
    smoke *= smoothstep(1.0, 0.2, vUv.y);

    // Final color
    gl_FragColor = vec4(1.0, 1.0, 1.0, smoke);
    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}