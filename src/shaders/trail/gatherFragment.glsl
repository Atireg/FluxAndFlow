uniform vec3 uInks[3]; // dark red, orange, grey - POINT_INKS in script.js
uniform float uOpacity; // the most ink a point lays down - POINT_OPACITY
uniform float uReveal; // 0..1, the cloud fading in - REVEAL_DURATION
uniform float uTrailOpacity; // a tail's ink at its head, as a share of its point's

varying float vAlpha; // fading to nothing down the tail
varying float vArrived;
varying float vTone;

void main() {
    vec3 ink = vTone < 0.5 ? uInks[0] : (vTone < 1.5 ? uInks[1] : uInks[2]);
    // As faint as its point, which is fainter while still scattered
    float weight = mix(0.35, 1.0, vArrived) * uOpacity * uTrailOpacity;
    gl_FragColor = vec4(ink, vAlpha * weight * uReveal);
}
