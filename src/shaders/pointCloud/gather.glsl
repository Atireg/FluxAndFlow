// The gather, shared by a cloud's points (vertex.glsl) and their tails
// (trailVertex.glsl): where a point is at any moment of it, so a tail can
// ask where its point was a moment ago.
uniform float uGather; // 0 = every point out at its scattered position, 1 = all home
uniform float uGatherSpread; // the latest any point starts, as a share of the gather
uniform float uGatherSwirl; // radians the scatter turns through on the way in

attribute vec3 aScatter; // where this point starts, in the cloud's own space
attribute float aGatherDelay; // 0..1, when it sets off within the spread

// How far home a point is at gather progress g, 0..1. Each sets off at its
// own moment and eases home, settling gently rather than stopping dead.
// A cloud without the gather attributes reads them as 0 and is home at 1.
float gatherArrived(float g) {
    float t = clamp((g - aGatherDelay * uGatherSpread) / (1.0 - uGatherSpread), 0.0, 1.0);
    float rest = 1.0 - t; // multiplied out: pow() of 0 is undefined in GLSL
    return 1.0 - rest * rest * rest;
}

// Where it is that far home. The scatter swirls round the vertical axis as
// it closes in, so the points spiral in like a current rather than flying
// straight home
vec3 gatherPosition(vec3 home, float arrived) {
    float angle = (1.0 - arrived) * uGatherSwirl;
    vec3 scatter = aScatter;
    scatter.xz = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * scatter.xz;
    return mix(scatter, home, arrived);
}
