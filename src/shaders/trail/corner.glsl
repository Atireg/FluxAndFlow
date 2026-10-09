// A tail behind a moving point: a thin quad from where the point is (the
// head) back to where it was a moment ago (the tail), as wide as the point
// at the head and tapering to nothing. Each tail is one instance of a
// four-corner quad whose `position` carries the corner: x 0 at the head,
// 1 at the tail; y -1 or 1, the side.
uniform vec2 uResolution; // the drawing buffer, in pixels

// This corner in clip space, for a tail between two view-space positions,
// `width` pixels wide at the head. `moving` is 0 for a point that has
// barely moved (no tail), rising to 1 by a couple of pixels
vec4 trailCorner(vec4 headView, vec4 tailView, float width, out float moving) {
    vec4 head = projectionMatrix * headView;
    vec4 tail = projectionMatrix * tailView;
    vec2 halfScreen = 0.5 * uResolution;
    vec2 headPx = head.xy / head.w * halfScreen;
    vec2 tailPx = tail.xy / tail.w * halfScreen;

    vec2 along = headPx - tailPx;
    float span = length(along);
    vec2 direction = span > 0.001 ? along / span : vec2(1.0, 0.0);
    vec2 across = vec2(-direction.y, direction.x);
    moving = smoothstep(0.5, 2.0, span);

    float end = position.x;
    vec4 clip = mix(head, tail, end);
    vec2 px = clip.xy / clip.w * halfScreen + across * position.y * 0.5 * width * (1.0 - end);
    return vec4(px / halfScreen * clip.w, clip.z, clip.w);
}
