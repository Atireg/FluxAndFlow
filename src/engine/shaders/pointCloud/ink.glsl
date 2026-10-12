// The points' inks, shared by every shader that draws them: a cloud's, its
// tails', and a pebble's dissolve and its tails. Put in front of each
// fragment shader (pointcloud/load.js, pebbles/dissolve.js); the uniforms
// come from pointInkUniforms() in engine/colors.js.
uniform vec3 uInks[3]; // dark red, orange, grey - POINT_INKS in engine/colors.js
uniform float uOpacity; // the most ink a point lays down - POINT_OPACITY

// The ink a point is drawn in, by its tone: 0, 1 or 2, picked at random per point
vec3 pickInk(float tone) {
    return tone < 0.5 ? uInks[0] : (tone < 1.5 ? uInks[1] : uInks[2]);
}
