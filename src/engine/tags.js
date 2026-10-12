import * as THREE from 'three';
import { CUBE_SIZE, PEBBLE_RADIUS, PEBBLE_SQUASH } from './constants.js';
import { SPOTLIGHT_TAG_MIN, spotlightGlow, spotlightIntensity } from './pebbles/spotlight.js';

/**
 * The catalog's words on its pebbles: "Still empty..." for a moment on an
 * empty slot that was just clicked, and the glowing pebble's name hanging
 * below it on a string, blinking with its glow and gone once it's back in
 * its float.
 *
 * These are HTML and SVG, not scene objects, so they are placed in screen
 * pixels every frame. React renders the elements and hands them over here;
 * nothing about them goes through React state, because they move every frame
 * (see DECISIONS.md).
 */
const EMPTY_TAG_DURATION = 1.6; // seconds "Still empty..." stays up after a click
const EMPTY_TAG_FADE = 0.3; // seconds of that spent fading out

/**
 * The glowing pebble's name hangs below it on a thin string, and the string
 * behaves like one: a short rope of ROPE_SEGMENTS links, each point pulled by
 * gravity and an uneven breeze and held to its neighbours, the tag a heavier
 * weight at the end. Its top is tied to the pebble's lower edge, so the
 * pebble's jump and rock send curves rippling down it, and the breeze keeps
 * it alive in between. Simulated in screen pixels with memory (like the
 * flow), in fixed small steps; it starts hanging straight down for each new
 * pebble.
 */
const TAG_KNOT_SIZE = 0.055; // the knot's radius, as a share of the pebble's radius on screen
const TAG_STRING_LENGTH = 0.8; // as a share of the pebble's radius on screen
const TAG_STRING_MIN = 22; // px
const ROPE_SEGMENTS = 10;
const ROPE_ITERATIONS = 12; // constraint passes per step - higher is less stretchy
const ROPE_STIFFNESS = 0.05; // a thread's slight resistance to bending, once a step - curves, doesn't crinkle
const TAG_WEIGHT = 2; // the tag against one point of string - light, so the string bellies in the wind
const TAG_GRAVITY = 1500; // px/s^2
const TAG_DAMPING = 0.9; // per second - swings carry on a while before settling
const TAG_BREEZE = 900; // px/s^2 at the height of a gust
const TAG_GUST = 0.35; // gusts per second, roughly - the wind rises and falls rather than blowing steadily
const TAG_WAVE_LAG = 0.35; // seconds a gust takes to travel from the knot to the tag, so it ripples down
const TAG_STEP = 1 / 120; // seconds per integration step
const TAG_MAX_SWING = 0.95; // radians (~55 degrees) the tag may swing from under the knot

/**
 * The wind on the string at a moment: gusts that swell and die away (a slow
 * envelope, never quite still), each carrying a quicker flutter, mostly
 * blowing one way with the odd turn back. Roughly -1..1.
 */
function wind(t) {
    const gust = 0.35 + 0.65 * Math.max(0, Math.sin(t * TAG_GUST * Math.PI * 2) * 0.6 + Math.sin(t * TAG_GUST * 4.1 + 1.7) * 0.4);
    const sway = 0.65 * Math.sin(t * 1.1 + 0.4) + 0.35;
    const flutter = 0.45 * Math.sin(t * 5.3) + 0.25 * Math.sin(t * 8.7 + 2.1);
    return gust * (sway + flutter);
}

/**
 * A rope of `segments` links in screen pixels, its first point tied to a knot
 * the caller moves, its last a tag `weight` times heavier than a point of
 * string. Verlet with fixed small steps (TAG_STEP), so it behaves the same at
 * 5 fps as at 120. The catalog's spotlight string is stiff (`iterations`
 * passes, each link held to its length outright); the tap hint's is elastic -
 * fewer passes, each giving only `give` of the way, so it stretches and
 * springs back - and `slack`, so links only pull, as a string does, and a
 * rope bunched at the knot can fall open.
 */
function createRope({ segments, iterations, weight, give = 1, slack = false, still }) {
    const rope = { points: [], pivotX: 0, pivotY: 0, lastTime: 0 };

    return {
        points: rope.points,

        /**
         * Starts it hanging from the knot at (ax, ay): straight down, at
         * rest, or with `open` below 1 bunched up into that share of its
         * length, to fall open and bounce
         */
        start(ax, ay, link, elapsedTime, open = 1) {
            rope.points.length = 0;
            for (let i = 0; i <= segments; i++) {
                const y = ay + link * i * open;
                rope.points.push({ x: ax, y, prevX: ax, prevY: y });
            }
            rope.pivotX = ax;
            rope.pivotY = ay;
            rope.lastTime = elapsedTime;
        },

        // Moves it on to `elapsedTime`, the knot now at (ax, ay)
        step(ax, ay, link, elapsedTime) {
            // The knot moves smoothly across the steps rather than all at
            // once, so a slow frame doesn't yank the string
            const span = Math.min(elapsedTime - rope.lastTime, 0.1);
            const fromX = rope.pivotX;
            const fromY = rope.pivotY;
            rope.pivotX = ax;
            rope.pivotY = ay;
            rope.lastTime = elapsedTime;

            const points = rope.points;
            const last = points.length - 1;
            let remaining = span;

            while (remaining > 0) {
                const dt = Math.min(TAG_STEP, remaining);
                remaining -= dt;

                const t = elapsedTime - remaining;
                const along = span > 0 ? 1 - remaining / span : 1;
                const knotX = fromX + (ax - fromX) * along;
                const knotY = fromY + (ay - fromY) * along;
                const keep = 1 - TAG_DAMPING * dt;

                // Every point but the knot moves on its own momentum, falls,
                // and is pushed by a breeze that's a little out of step from
                // one to the next
                for (let i = 1; i <= last; i++) {
                    const p = points[i];
                    const breeze = still ? 0 : TAG_BREEZE * wind(t - (i / last) * TAG_WAVE_LAG);
                    const nextX = p.x + (p.x - p.prevX) * keep + breeze * dt * dt;
                    const nextY = p.y + (p.y - p.prevY) * keep + TAG_GRAVITY * dt * dt;
                    p.prevX = p.x;
                    p.prevY = p.y;
                    p.x = nextX;
                    p.y = nextY;
                }

                // Hold each link at its length, the knot pinned and the tag
                // heavier, so the string gives way to the tag rather than the
                // other way round
                points[0].x = knotX;
                points[0].y = knotY;
                for (let pass = 0; pass < iterations; pass++) {
                    for (let i = 0; i < last; i++) {
                        const a = points[i];
                        const b = points[i + 1];
                        const dx = b.x - a.x;
                        const dy = b.y - a.y;
                        const d = Math.hypot(dx, dy) || 1;
                        if (slack && d < link) continue;
                        const pull = (d - link) / d * give;
                        const wa = i === 0 ? 0 : 1;
                        const wb = i + 1 === last ? 1 / weight : 1;
                        const share = wa + wb;
                        a.x += dx * pull * (wa / share);
                        a.y += dy * pull * (wa / share);
                        b.x -= dx * pull * (wb / share);
                        b.y -= dy * pull * (wb / share);
                    }
                }

                // A little stiffness: each point is nudged towards the line
                // through its neighbours, so a sharp kink eases out but a
                // curve survives
                for (let i = 1; i < last; i++) {
                    const a = points[i - 1];
                    const b = points[i];
                    const c = points[i + 1];
                    b.x += ((a.x + c.x) / 2 - b.x) * ROPE_STIFFNESS;
                    b.y += ((a.y + c.y) / 2 - b.y) * ROPE_STIFFNESS;
                }

                // The tag never swings further than TAG_MAX_SWING from under
                // the knot
                const tag = points[last];
                const reach = Math.hypot(tag.x - knotX, tag.y - knotY);
                const swing = Math.atan2(tag.x - knotX, tag.y - knotY);
                if (Math.abs(swing) > TAG_MAX_SWING) {
                    const capped = Math.sign(swing) * TAG_MAX_SWING;
                    tag.x = knotX + Math.sin(capped) * reach;
                    tag.y = knotY + Math.cos(capped) * reach;
                }
            }

            return points;
        },

        // Sets every point but the knot moving down, more the further along
        // it is, at up to `speed` px/s - a tug from above
        tug(speed) {
            const last = rope.points.length - 1;
            for (let i = 1; i <= last; i++) rope.points[i].prevY -= speed * (i / last) * TAG_STEP;
        },
    };
}

/**
 * Draws a rope into its SVG and hangs a tag from its end: the tag turned with
 * the string's overall lean and a little of its last stretch - never past
 * TAG_MAX_SWING - the string one smooth curve through every point
 * (Catmull-Rom, as cubic Beziers) in both paths, and a dot of radius `knot`
 * where it's tied on, with a glow like the string's.
 */
function drawRope(points, tagElement, paths, knots, knot) {
    const last = points.length - 1;
    const { x: ax, y: ay } = points[0];

    const tag = points[last];
    const before = points[Math.floor(last / 2)];
    const lean = Math.atan2(tag.x - ax, tag.y - ay);
    const end = Math.atan2(tag.x - before.x, tag.y - before.y);
    const angle = THREE.MathUtils.clamp(lean * 0.6 + end * 0.4, -TAG_MAX_SWING, TAG_MAX_SWING);
    tagElement.style.transform = `translate(${tag.x}px, ${tag.y}px) translate(-50%, 0) rotate(${-angle}rad)`;

    let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < last; i++) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, last)];
        d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)}`
            + ` ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)}`
            + ` ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    for (const path of paths) path.setAttribute('d', d);

    knots.forEach((circle, index) => {
        circle.setAttribute('cx', ax.toFixed(1));
        circle.setAttribute('cy', ay.toFixed(1));
        circle.setAttribute('r', (index === 0 ? knot * 2.2 : knot).toFixed(1));
    });
}

/**
 * The tap hint's string: the same rope and look as the spotlight's, hung from
 * the bottom of the hint's dot (styles.css, .tap-hint) with "double-click"
 * on its end. It drops bunched up as the dot appears and bounces on
 * an elastic string, and each of the dot's two taps tugs it again. It lives
 * and fades with the dot (tap-hint-life in styles.css: in by 12% of
 * HINT_LIFE, out from 80%).
 */
const HINT_LIFE = 2.2; // seconds - .tap-hint.is-showing's animation
const HINT_TAPS = [0.25, 0.48]; // the dot's presses, as shares of HINT_LIFE (tap-hint-press)
const HINT_STRING_LENGTH = 1.6; // as a share of the dot's size
const HINT_STRING_MIN = 30; // px
const HINT_SEGMENTS = 6;
const HINT_ITERATIONS = 2;
const HINT_GIVE = 0.3; // share of each link's stretch taken back per pass - lower is more elastic
const HINT_WEIGHT = 3;
const HINT_OPEN = 0.1; // the share of its length it starts bunched into
const HINT_TUG = 6; // a tap's tug, in string lengths per second

// The dot's size: --hint-size in styles.css, clamp(1.1rem, 3vmin, 2.6rem)
function hintSize(screen) {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return THREE.MathUtils.clamp(Math.min(screen.width, screen.height) * 0.03, 1.1 * rem, 2.6 * rem);
}

// tap-hint-life: in by 12%, held, out from 80%
function hintOpacity(age) {
    const at = age / HINT_LIFE;
    if (at <= 0 || at >= 1) return 0;
    if (at < 0.12) return at / 0.12;
    if (at > 0.8) return (1 - at) / 0.2;
    return 1;
}

export function createTags({ screen, rig, state, overlays }) {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const anchor = new THREE.Vector3();
    const tagPivot = new THREE.Vector3();
    const tagCentre = new THREE.Vector3();
    const rope = createRope({ segments: ROPE_SEGMENTS, iterations: ROPE_ITERATIONS, weight: TAG_WEIGHT, still });
    let ropePebble = null;

    const hintRope = createRope({
        segments: HINT_SEGMENTS, iterations: HINT_ITERATIONS, weight: HINT_WEIGHT,
        give: HINT_GIVE, slack: true, still,
    });
    const hint = { shownAt: null, x: 0, y: 0, taps: 0 };

    // Where a point on a pebble lands on screen, in pixels
    function screenPoint(vector) {
        vector.project(rig.camera);
        return [(vector.x + 1) / 2 * screen.width, (1 - vector.y) / 2 * screen.height];
    }

    /**
     * Pins a tag over the lower part of a pebble's top face, on screen. On
     * the face rather than above it, since a top-row pebble has no room above
     * it on a tight frame.
     */
    function placeTagOnPebble(tag, pebble) {
        // Down the screen is world +Z from the overhead catalog camera
        pebble.updateMatrixWorld();
        anchor.set(0, PEBBLE_RADIUS * PEBBLE_SQUASH, CUBE_SIZE * 0.36).multiplyScalar(pebble.userData.size);
        pebble.localToWorld(anchor).project(rig.camera);

        const x = (anchor.x + 1) / 2 * screen.width;
        const y = (1 - anchor.y) / 2 * screen.height;
        tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }

    function hangSpotlightTag(pebble, elapsedTime) {
        const { spotlightTag, stringPaths, knots } = overlays;

        // Tied to the pebble's lower edge as seen from above - down the
        // screen is world +Z - just inside its rim
        pebble.updateMatrixWorld();
        const [ax, ay] = screenPoint(pebble.localToWorld(tagPivot.set(0, 0, PEBBLE_RADIUS * pebble.userData.size * 0.9)));
        const [cx, cy] = screenPoint(pebble.localToWorld(tagCentre.set(0, 0, 0)));
        const pebbleRadius = Math.hypot(ax - cx, ay - cy) / 0.9;
        const length = Math.max(TAG_STRING_MIN, pebbleRadius * TAG_STRING_LENGTH);
        const link = length / ROPE_SEGMENTS;

        // A new pebble: the string hangs straight down, at rest
        if (ropePebble !== pebble) {
            ropePebble = pebble;
            rope.start(ax, ay, link, elapsedTime);
        }

        const points = rope.step(ax, ay, link, elapsedTime);
        drawRope(points, spotlightTag, stringPaths, knots, THREE.MathUtils.clamp(pebbleRadius * TAG_KNOT_SIZE, 2, 6));
    }

    function hangHint(elapsedTime) {
        const { hintTag, hintString, hintStringPaths, hintKnots } = overlays;
        if (!hintTag || !hintString) return;

        const age = hint.shownAt === null ? Infinity : elapsedTime - hint.shownAt;
        const opacity = hintOpacity(age);
        hintTag.style.opacity = opacity;
        hintString.style.opacity = opacity;
        if (opacity <= 0) return;

        // Tied to the bottom of the dot
        const size = hintSize(screen);
        const ax = hint.x;
        const ay = hint.y + size / 2;
        const length = Math.max(HINT_STRING_MIN, size * HINT_STRING_LENGTH);
        const link = length / HINT_SEGMENTS;

        if (hint.taps === -1) {
            hintRope.start(ax, ay, link, elapsedTime, still ? 1 : HINT_OPEN);
            hint.taps = 0;
        }

        // Each of the dot's presses tugs the string
        while (!still && hint.taps < HINT_TAPS.length && age >= HINT_TAPS[hint.taps] * HINT_LIFE) {
            hintRope.tug(HINT_TUG * length);
            hint.taps++;
        }

        const points = hintRope.step(ax, ay, link, elapsedTime);
        drawRope(points, hintTag, hintStringPaths, hintKnots, THREE.MathUtils.clamp(size * 0.08, 2, 4));
    }

    return {
        // The tap hint has just appeared at (x, y), in screen pixels
        showHint(x, y, elapsedTime) {
            Object.assign(hint, { shownAt: elapsedTime, x, y, taps: -1 });
        },

        hideHint() {
            hint.shownAt = null;
        },

        update(elapsedTime) {
            const { spotlightTag, spotlightString, emptyTag } = overlays;
            if (!spotlightTag || !spotlightString || !emptyTag) return;

            const inCatalog = state.view === 'catalog';

            /**
             * The same beat and ramp the pebble itself glows by, so the name
             * is brightest when the pebble is most orange and has faded out
             * entirely by the time the pebble has settled. "Still empty..."
             * wins on its own pebble.
             */
            const spotlit = state.spotlight.pebble;
            const spotlightShows = inCatalog && spotlit && spotlit !== state.emptyTag.pebble;

            if (spotlightShows) {
                const glow = spotlightGlow(state, elapsedTime);
                const label = spotlit.userData.label;
                if (spotlightTag.textContent !== label) spotlightTag.textContent = label;

                const intensity = spotlightIntensity(state, elapsedTime);
                hangSpotlightTag(spotlit, elapsedTime);
                spotlightTag.style.opacity = intensity * (SPOTLIGHT_TAG_MIN + (1 - SPOTLIGHT_TAG_MIN) * glow);

                // The string doesn't blink with the name, it just comes and goes
                spotlightString.style.opacity = intensity;
            } else {
                spotlightTag.style.opacity = 0;
                spotlightString.style.opacity = 0;
                ropePebble = null;
            }

            hangHint(elapsedTime);

            const emptySince = elapsedTime - state.emptyTag.shownAt;
            const emptyOpacity = inCatalog && state.emptyTag.pebble
                ? Math.max(0, Math.min(1, (EMPTY_TAG_DURATION - emptySince) / EMPTY_TAG_FADE))
                : 0;

            if (emptyOpacity > 0) {
                placeTagOnPebble(emptyTag, state.emptyTag.pebble);
            } else {
                state.emptyTag.pebble = null;
            }
            emptyTag.style.opacity = emptyOpacity;
        },
    };
}
