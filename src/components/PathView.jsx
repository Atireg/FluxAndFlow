import { useEffect, useRef } from 'react';
import { assetUrl } from '../engine/assets.js';
import { PATH_HINT, PATH_VIEW } from '../app/words.js';
import { MILESTONES } from '../app/path.js';

/**
 * "The path": the employment history, as a washing line under the view's
 * name with DOT_COUNT dots pegged on it - the tap hint's dot, white with a
 * black outline - each on a short thread. The line bellies, lifts and
 * ripples in the wind; each dot hangs as a pendulum free to swing sideways
 * and to and from the visitor (seen as its thread shortening), pushed by the
 * same wind where it hangs and jolted as the line moves under it. The wind
 * is smooth noise, not waves, with gusts that cross the line from the left;
 * each thread a little longer or shorter, so no two dots keep time. Under
 * each dot, moving with it, its milestone (app/path.js).
 *
 * Hovered (tapped on a touch screen), a dot presses twice like the tap hint,
 * rings spreading from it, and on the second press a card with the
 * milestone's details and picture drops from it on a string, drifting side
 * to side like the hint's falling leaf until it settles hanging under the
 * dot. Let go, the card falls on away and fades, as the hint does.
 *
 * On a phone (under 860px) the line runs down the screen instead, by its
 * left edge, and the dots fly from it like flags: blown out to the right on
 * their threads, fluttering, the milestone beside each.
 *
 * Moves every frame, so never through React state: its own frame loop
 * writes the SVG through refs, and only while it is on screen.
 */
const DOT_COUNT = MILESTONES.length;
const SAG = 0.05; // the line's belly, as a share of its length
const LIFT = 0.4; // how much of the belly the wind lifts and drops
const THREAD = 1.6; // a thread's length, in dot sizes, on average
const THREAD_SPREAD = 0.35; // each thread up to this share longer or shorter
const SWING = 6.3; // gravity over thread length: a swing of about 2.5s
const DAMPING = 0.45;
const PUSH = 5; // how far the wind pushes a dot round
const TURBULENCE = 5; // how hard the eddies push a dot to and fro
const GUST_CROSSING = 1.4; // seconds a gust takes to cross the line
const MAX_STEP = 1 / 30; // a stalled frame holds the swing rather than flinging it
const HINT_SHOW = 3.2; // seconds "click me!" stays over one dot
const HINT_GAP = 0.9; // seconds before it shows over another
const HINT_FADE = 0.4; // seconds it fades in and out
const UPRIGHT_BELOW = 860; // px wide: the line runs down the screen, the dots fly as flags
const FLAG_PUSH = 16; // how hard the wind holds a flag out: it flies about 70 degrees from hanging
const FLAG_TWIST = 9; // how hard the flutter twists it to and fro
const DROP_AFTER = 0.55; // seconds from the hover to the second press, when the card drops
const DROP_EASE = 0.35; // seconds it takes to settle, roughly
const DROP_HANG = 1.3; // the card's string, in dot sizes
const DROP_SWAY = 1.4; // its drift either side as it drops, in dot sizes
const DROP_SWAY_PERIOD = 1.6; // seconds, one drift there and back
const DROP_TILT = 0.12; // radians it tilts by as it drifts
const LET_GO = 0.9; // seconds a card takes to fall away and fade once let go
const LEAVE_GRACE = 1800; // ms a card stays once the pointer has left it or its dot - to read, or to reach it

// A fixed 0..1 for each whole number, for the noise and the threads
function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

// Smooth noise along one line, -1..1: gradients at whole numbers, eased between
function noise(x) {
    const i = Math.floor(x);
    const f = x - i;
    const a = (hash(i) * 2 - 1) * f;
    const b = (hash(i + 1) * 2 - 1) * (f - 1);
    const u = f * f * f * (f * (f * 6 - 15) + 10);
    return 2 * (a + (b - a) * u);
}

// The wind at `share` along the line at `t` seconds: a breeze that rises and
// falls, gusts that reach the left end first, and a flutter of its own at
// each place
function wind(share, t) {
    const gusting = t - share * GUST_CROSSING;
    return 0.1
        + 0.09 * noise(gusting * 0.22)
        + 0.06 * noise(gusting * 0.7 + 40)
        + 0.03 * noise(t * 1.7 + share * 9 + 80);
}

// The wind a flag feels at `share` down the line: steady enough to hold it
// out, with gusts and a quick flutter
function flagWind(share, t) {
    const gusting = t - share * GUST_CROSSING;
    return 0.8
        + 0.22 * noise(gusting * 0.4 + 500)
        + 0.14 * noise(t * 3.1 + share * 11 + 600);
}

// Eddies to and from the visitor at `share`, -1..1
function eddy(share, t) {
    return noise(t * 0.5 + share * 3 + 120) * 0.7 + noise(t * 1.3 - share * 5 + 200) * 0.3;
}

// The tap hint's --hint-size, clamp(1.1rem, 3vmin, 2.6rem), in pixels
function dotSize() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const vmin = Math.min(window.innerWidth, window.innerHeight) / 100;
    return Math.min(Math.max(1.1 * rem, 3 * vmin), 2.6 * rem);
}

export default function PathView({ shown }) {
    const titleRef = useRef(null);
    const hintRef = useRef(null);
    const svgRef = useRef(null);

    useEffect(() => {
        if (!shown) return undefined;

        const svg = svgRef.current;
        const labels = [...svg.parentNode.querySelectorAll('.path-view__label')];
        const [glow, line] = svg.querySelectorAll('.path-view__line path');
        const knots = svg.querySelectorAll('.path-view__end');
        const cards = [...svg.parentNode.querySelectorAll('.path-view__card')];
        const dots = [...svg.querySelectorAll('.path-view__dot')].map((group, i) => ({
            group,
            card: cards[i],
            hit: group.querySelector('.path-view__hit'),
            label: labels[i],
            hang: group.querySelector('.path-view__hang'),
            openAt: null, // seconds, when it was hovered
            closeAt: null, // seconds, when it was let go
            leaving: 0, // the timer that lets go of it
            thread: group.querySelector('.path-view__thread'),
            peg: group.querySelector('.path-view__peg'),
            dot: group.querySelector('.path-view__ball'),
            length: 1 + THREAD_SPREAD * (hash(i + 7) * 2 - 1),
            side: 0, // radians, the swing across the screen
            sideSpeed: 0,
            depth: 0, // radians, the swing to and from the visitor
            depthSpeed: 0,
            lastY: null,
            upright: null, // the layout it last swung in
            fall: 0, // how fast the line under it is moving down, px/s
        }));
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let frame = 0;
        let last = performance.now();
        // "click me!": over which dot, and since when
        const hint = { dot: Math.floor(Math.random() * DOT_COUNT), at: performance.now() / 1000 };
        const seconds = () => performance.now() / 1000;

        // Hovered or tapped: press twice (the CSS restarted), then drop the card
        const open = (hung) => {
            clearTimeout(hung.leaving);
            if (hung.openAt !== null && hung.closeAt === null) return;
            hung.openAt = seconds();
            hung.closeAt = null;
            hung.group.classList.remove('is-pressed');
            void hung.group.getBoundingClientRect();
            hung.group.classList.add('is-pressed');
        };
        const close = (hung) => {
            clearTimeout(hung.leaving);
            if (hung.openAt === null || hung.closeAt !== null) return;
            hung.closeAt = seconds();
        };
        const leave = (hung) => {
            clearTimeout(hung.leaving);
            hung.leaving = setTimeout(() => close(hung), LEAVE_GRACE);
        };
        const listeners = [];
        const on = (target, type, handler) => {
            target.addEventListener(type, handler);
            listeners.push(() => target.removeEventListener(type, handler));
        };
        dots.forEach((hung) => {
            // The dot, its words beside or under it, and its card
            [hung.hit, hung.label, hung.card].forEach((target) => {
                on(target, 'pointerenter', (event) => { if (event.pointerType === 'mouse') open(hung); });
                on(target, 'pointerleave', (event) => { if (event.pointerType === 'mouse') leave(hung); });
            });
            // A touch has no hover: a tap on the dot or its words opens it,
            // another closes it
            [hung.hit, hung.label].forEach((target) => on(target, 'pointerup', (event) => {
                if (event.pointerType === 'mouse') return;
                const opened = hung.openAt !== null && hung.closeAt === null;
                dots.forEach(close);
                if (!opened) open(hung);
            }));
        });
        // A tap anywhere else, the card itself included, lets go of them all
        on(document, 'pointerup', (event) => {
            if (event.pointerType === 'mouse' || event.target.closest?.('.path-view__hit, .path-view__label')) return;
            dots.forEach(close);
        });

        /**
         * The card, `since` its dot's second press: dropping from under the
         * dot (`bottomX`, `bottomY`) on its string and settling, drifting
         * side to side as it goes; let go, falling on and fading. Kept
         * inside the screen's margins, its string tied where it can reach.
         */
        const dropCard = (hung, bottomX, bottomY, size, margin, width, label) => {
            const card = hung.card.style;
            const now = seconds();
            const since = hung.openAt === null ? -1 : now - hung.openAt - DROP_AFTER;
            const gone = hung.closeAt !== null ? (now - hung.closeAt) / LET_GO : 0;

            if (since < 0 || gone >= 1) {
                if (gone >= 1) {
                    hung.openAt = null;
                    hung.closeAt = null;
                    hung.group.classList.remove('is-pressed');
                }
                card.visibility = 'hidden';
                hung.hang.style.visibility = 'hidden';
                label.opacity = '';
                return;
            }

            const fade = still ? 1 : Math.exp(-since / (DROP_SWAY_PERIOD * 0.5));
            const phase = (since / DROP_SWAY_PERIOD) * Math.PI * 2;
            const settle = still ? 1 : 1 - Math.exp(-since / DROP_EASE);
            const away = gone * gone * size * 6;
            const cardWidth = hung.card.offsetWidth;
            const swayX = DROP_SWAY * size * Math.sin(phase) * fade;
            const leftX = Math.min(Math.max(bottomX + swayX - cardWidth / 2, margin), width - margin - cardWidth);
            // Never past the foot of the screen: a low flag's card stops
            // short, over its dot if need be
            const lowest = window.innerHeight - margin - hung.card.offsetHeight;
            const topY = Math.min(bottomY + DROP_HANG * size * settle, Math.max(lowest, margin)) + away;
            const tilt = DROP_TILT * Math.cos(phase) * fade;

            card.visibility = 'visible';
            card.opacity = String(Math.min(since / 0.25, 1) * (1 - gone));
            card.transform = `translate(${leftX.toFixed(1)}px, ${topY.toFixed(1)}px) rotate(${tilt.toFixed(3)}rad)`;
            // The label under the dot says the same: out of the card's way
            label.opacity = String(Math.max(0, 1 - Math.min(since / 0.25, 1) * (1 - gone)));

            const tieX = Math.min(Math.max(bottomX + swayX, leftX + 12), leftX + cardWidth - 12);
            hung.hang.style.visibility = gone > 0 || topY < bottomY ? 'hidden' : 'visible';
            hung.hang.setAttribute('x1', bottomX);
            hung.hang.setAttribute('y1', bottomY);
            hung.hang.setAttribute('x2', tieX);
            hung.hang.setAttribute('y2', topY);
        };

        const draw = (now) => {
            const t = still ? 0 : now / 1000;
            const step = Math.min((now - last) / 1000, MAX_STEP);
            last = now;

            const width = window.innerWidth;
            const margin = Math.max(20, Math.min(40, width * 0.03));
            // The name sits under the filter, however many rows it wraps to
            const filter = document.querySelector('.filter')?.getBoundingClientRect();
            titleRef.current.style.top = `${filter ? filter.bottom - margin * 0.5 : margin}px`;
            const title = titleRef.current.getBoundingClientRect();
            const upright = width < UPRIGHT_BELOW;
            const left = upright ? margin + 4 : margin;
            const right = width - margin;
            const top = title.bottom + (upright ? 22 : Math.max(28, window.innerHeight * 0.06));
            const bottom = window.innerHeight - margin;
            const length = upright ? bottom - top : right - left;
            const size = dotSize();
            const labelWidth = upright
                ? width - left - SAG * length - size * (THREAD + 2) - margin
                : (length / DOT_COUNT) * 0.92;
            const belly = SAG * length * (1 + (still ? 0 : LIFT * (noise(t * 0.3 + 300) - 2 * (wind(0.5, t) - 0.1))));

            // Where the line is at `share` along it: a belly, and ripples
            // running along it with the gusts
            const at = (share) => {
                const ripple = still ? 0 : 0.014 * length * Math.sin(Math.PI * share)
                    * noise(t * 0.9 - share * 2.5 + 400);
                const bow = belly * 4 * share * (1 - share) + ripple;
                // Upright, the wind bows the line out to the right
                return upright ? [left + bow * 0.6, top + share * length] : [left + share * length, top + bow];
            };

            let d = '';
            for (let i = 0; i <= 40; i++) {
                const [x, y] = at(i / 40);
                d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
            }
            glow.setAttribute('d', d);
            line.setAttribute('d', d);
            [at(0), at(1)].forEach(([x, y], i) => {
                knots[i].setAttribute('cx', x);
                knots[i].setAttribute('cy', y);
            });

            // "click me!" over one dot at a time, chosen at random - never
            // the last one again, nor one with its card out - fading in and
            // out; over a dot whose card opens, it fades out at once
            const cardOut = (i) => dots[i].openAt !== null;
            if (now / 1000 - hint.at > HINT_SHOW + HINT_GAP) {
                const others = [...Array(DOT_COUNT).keys()].filter((i) => i !== hint.dot && !cardOut(i));
                if (others.length) hint.dot = others[Math.floor(Math.random() * others.length)];
                hint.at = now / 1000;
            } else if (cardOut(hint.dot) && now / 1000 - hint.at < HINT_SHOW - HINT_FADE) {
                hint.at = now / 1000 - (HINT_SHOW - HINT_FADE);
            }
            const shownFor = now / 1000 - hint.at;
            hintRef.current.style.opacity = String(still ? 1 : Math.max(0, Math.min(
                shownFor / HINT_FADE, (HINT_SHOW - shownFor) / HINT_FADE, 1,
            )));

            dots.forEach((hung, i) => {
                const share = (i + 0.5) / DOT_COUNT;
                const [x, y] = at(share);
                const reach = THREAD * size * hung.length;

                // Starting out, or the layout changed: already where the wind
                // holds it, rather than flung there from hanging straight down
                if (hung.upright !== upright) {
                    hung.upright = upright;
                    hung.side = upright
                        ? Math.atan(FLAG_PUSH * flagWind(share, t) / SWING)
                        : Math.asin(Math.min(1, PUSH * wind(share, t) / SWING));
                    hung.sideSpeed = 0;
                    hung.depth = 0;
                    hung.depthSpeed = 0;
                    hung.lastY = null;
                }

                if (!still && step > 0) {
                    // The line dropping under it lightens the dot a moment,
                    // rising makes it heavier: gravity as the dot feels it
                    const fall = hung.lastY === null ? 0 : (y - hung.lastY) / step;
                    const lurch = upright ? 0 : (fall - hung.fall) / step;
                    hung.fall = fall;
                    hung.lastY = y;
                    const gravity = (SWING / hung.length) * Math.min(2, Math.max(0.3, 1 - lurch / (SWING * reach)));

                    // A flag: the wind across it against its weight; hanging,
                    // the wind's push
                    const push = upright
                        ? FLAG_PUSH * flagWind(share, t) * Math.cos(hung.side)
                        : PUSH * wind(share, t);
                    const sidePull = -gravity * Math.sin(hung.side) - DAMPING * hung.sideSpeed
                        + push / hung.length;
                    hung.sideSpeed += sidePull * step;
                    hung.side += hung.sideSpeed * step;

                    const depthPull = -gravity * Math.sin(hung.depth) - DAMPING * hung.depthSpeed
                        + (upright ? FLAG_TWIST * eddy(share, t * 2.5) : TURBULENCE * eddy(share, t)) / hung.length;
                    hung.depthSpeed += depthPull * step;
                    hung.depth += hung.depthSpeed * step;
                }

                // Swung towards or away from the visitor, it hangs shorter
                // on screen
                const across = Math.sin(hung.side);
                const down = Math.cos(hung.side) * Math.cos(hung.depth);
                const toDot = reach + size / 2;
                hung.peg.setAttribute('cx', x);
                hung.peg.setAttribute('cy', y);
                hung.thread.setAttribute('x1', x);
                hung.thread.setAttribute('y1', y);
                hung.thread.setAttribute('x2', x + across * reach);
                hung.thread.setAttribute('y2', y + down * reach);
                hung.dot.setAttribute('cx', x + across * toDot);
                hung.dot.setAttribute('cy', y + down * toDot);
                hung.dot.setAttribute('r', size / 2);
                hung.dot.style.strokeWidth = Math.max(1.5, size * 0.08);

                const cx = x + across * toDot;
                const cy = y + down * toDot;
                // "click me!" over this one: a little up and to the right of a
                // hanging dot, clear of its thread; straight over a flag
                if (i === hint.dot) {
                    hintRef.current.style.transform = upright
                        ? `translate(${cx.toFixed(1)}px, ${(cy - size * 0.7).toFixed(1)}px) translate(-50%, -100%)`
                        : `translate(${(cx + size * 0.45).toFixed(1)}px, ${(cy - size * 0.45).toFixed(1)}px) translateY(-100%)`;
                }
                hung.hit.setAttribute('cx', cx);
                hung.hit.setAttribute('cy', cy);
                // Wider than the dot, so a swinging dot doesn't slip out from under the pointer
                hung.hit.setAttribute('r', size * 1.2);
                hung.group.querySelectorAll('.path-view__ripple').forEach((ring) => {
                    ring.setAttribute('cx', cx);
                    ring.setAttribute('cy', cy);
                    ring.setAttribute('r', size * 1.35);
                    ring.style.strokeWidth = Math.max(1.5, size * 0.08);
                });

                const label = labels[i].style;
                label.width = `${labelWidth}px`;
                // Beside a flag; under a hanging dot
                label.transform = upright
                    ? `translate(${(cx + size * 0.8).toFixed(1)}px, ${cy.toFixed(1)}px) translateY(-50%)`
                    : `translate(${(cx - labelWidth / 2).toFixed(1)}px, ${(cy + size * 0.75).toFixed(1)}px)`;

                dropCard(hung, cx, cy + size / 2, size, margin, width, label);
            });

            frame = requestAnimationFrame(draw);
        };

        frame = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(frame);
            listeners.forEach((off) => off());
            dots.forEach((hung) => {
                clearTimeout(hung.leaving);
                hung.card.style.visibility = 'hidden';
                hung.group.classList.remove('is-pressed');
            });
        };
    }, [shown]);

    return (
        <div className={`path-view${shown ? ' is-showing' : ''}`} aria-hidden={shown ? 'false' : 'true'}>
            <h2 className="path-view__title" ref={titleRef}>{PATH_VIEW.label}</h2>
            <p className="path-view__hint" ref={hintRef}>{PATH_HINT}</p>
            <svg className="path-view__scene" ref={svgRef} aria-hidden="true">
                <g className="path-view__line">
                    <path className="path-view__glow" />
                    <path />
                </g>
                <circle className="path-view__end" r="2.5" />
                <circle className="path-view__end" r="2.5" />
                {Array.from({ length: DOT_COUNT }, (_, i) => (
                    <g className="path-view__dot" key={i}>
                        <line className="path-view__thread" />
                        <line className="path-view__hang" />
                        <circle className="path-view__peg" r="1.8" />
                        <circle className="path-view__ripple" />
                        <circle className="path-view__ripple path-view__ripple--second" />
                        <circle className="path-view__ball" />
                        <circle className="path-view__hit" />
                    </g>
                ))}
            </svg>
            {MILESTONES.map(({ when, what, where }) => (
                <p className="path-view__label" key={when + what}>
                    <span className="path-view__when">{when}</span>
                    <span className="path-view__what">{what}</span>
                    <span className="path-view__where">{where}</span>
                </p>
            ))}
            {MILESTONES.map(({ when, what, where, details, image }) => (
                <article className="path-view__card" key={`card-${when}${what}`}>
                    {image && (
                        <img src={assetUrl(image.src)} alt={image.alt} style={{ aspectRatio: image.ratio }} />
                    )}
                    <p className="path-view__card-when">{when}</p>
                    <h3 className="path-view__card-what">{what}</h3>
                    <p className="path-view__card-where">{where}</p>
                    {details && <p className="path-view__card-details">{details}</p>}
                </article>
            ))}
        </div>
    );
}
