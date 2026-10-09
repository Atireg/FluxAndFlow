// The tail of a gathering point. Put after gather.glsl (pointCloud) and
// corner.glsl in script.js
uniform float uPointScale;
uniform float uSizeAttenuation; // 1.0 perspective, 0.0 orthographic
uniform float uTrailLag; // how far back the tail reaches, in gather progress

attribute vec3 aHome; // the point's own place - `position` is the quad's corner
attribute float aScale;
attribute float aTone;

varying float vAlpha;
varying float vArrived;
varying float vTone;

void main() {
    float arrived = gatherArrived(uGather);
    vec4 headView = modelViewMatrix * vec4(gatherPosition(aHome, arrived), 1.0);
    vec4 tailView = modelViewMatrix * vec4(gatherPosition(aHome, gatherArrived(uGather - uTrailLag)), 1.0);

    // As wide as the point is drawn (see pointCloud/vertex.glsl)
    float depth = mix(1.0, max(-headView.z, 0.001), uSizeAttenuation);
    float moving;
    gl_Position = trailCorner(headView, tailView, uPointScale * aScale / depth, moving);

    vAlpha = (1.0 - position.x) * moving;
    vArrived = arrived;
    vTone = aTone;
}
