uniform float uReveal; // 0..1, the cloud fading in - REVEAL_DURATION
uniform float uTrailOpacity; // a tail's ink at its head, as a share of its point's

varying float vAlpha; // fading to nothing down the tail
varying float vArrived;
varying float vTone;

void main() {
    // As faint as its point, which is fainter while still scattered
    float weight = mix(0.35, 1.0, vArrived) * uOpacity * uTrailOpacity;
    gl_FragColor = vec4(pickInk(vTone), vAlpha * weight * uReveal);
}
