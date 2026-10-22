import { useEffect, useRef } from 'react';
import { PATH_VIEW } from '../app/words.js';
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
    const svgRef = useRef(null);

    useEffect(() => {
        if (!shown) return undefined;

        const svg = svgRef.current;
        const labels = [...svg.parentNode.querySelectorAll('.path-view__label')];
        const [glow, line] = svg.querySelectorAll('.path-view__line path');
        const knots = svg.querySelectorAll('.path-view__end');
        const dots = [...svg.querySelectorAll('.path-view__dot')].map((group, i) => ({
            thread: group.querySelector('line'),
            peg: group.querySelector('.path-view__peg'),
            dot: group.querySelector('.path-view__ball'),
            length: 1 + THREAD_SPREAD * (hash(i + 7) * 2 - 1),
            side: 0, // radians, the swing across the screen
            sideSpeed: 0,
            depth: 0, // radians, the swing to and from the visitor
            depthSpeed: 0,
            lastY: null,
            fall: 0, // how fast the line under it is moving down, px/s
        }));
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let frame = 0;
        let last = performance.now();

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
            const left = margin;
            const right = width - margin;
            const top = title.bottom + Math.max(28, window.innerHeight * 0.06);
            const length = right - left;
            const size = dotSize();
            const labelWidth = (length / DOT_COUNT) * 0.92;
            const belly = SAG * length * (1 + (still ? 0 : LIFT * (noise(t * 0.3 + 300) - 2 * (wind(0.5, t) - 0.1))));

            // Where the line is at `share` along it: a belly, and ripples
            // running along it with the gusts
            const at = (share) => {
                const ripple = still ? 0 : 0.014 * length * Math.sin(Math.PI * share)
                    * noise(t * 0.9 - share * 2.5 + 400);
                return [left + share * length, top + belly * 4 * share * (1 - share) + ripple];
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

            dots.forEach((hung, i) => {
                const share = (i + 0.5) / DOT_COUNT;
                const [x, y] = at(share);
                const reach = THREAD * size * hung.length;

                if (!still && step > 0) {
                    // The line dropping under it lightens the dot a moment,
                    // rising makes it heavier: gravity as the dot feels it
                    const fall = hung.lastY === null ? 0 : (y - hung.lastY) / step;
                    const lurch = (fall - hung.fall) / step;
                    hung.fall = fall;
                    hung.lastY = y;
                    const gravity = (SWING / hung.length) * Math.min(2, Math.max(0.3, 1 - lurch / (SWING * reach)));

                    const sidePull = -gravity * Math.sin(hung.side) - DAMPING * hung.sideSpeed
                        + PUSH * wind(share, t) / hung.length;
                    hung.sideSpeed += sidePull * step;
                    hung.side += hung.sideSpeed * step;

                    const depthPull = -gravity * Math.sin(hung.depth) - DAMPING * hung.depthSpeed
                        + TURBULENCE * eddy(share, t) / hung.length;
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

                const label = labels[i].style;
                label.width = `${labelWidth}px`;
                label.transform = `translate(${(x + across * toDot - labelWidth / 2).toFixed(1)}px, `
                    + `${(y + down * toDot + size * 0.75).toFixed(1)}px)`;
            });

            frame = requestAnimationFrame(draw);
        };

        frame = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frame);
    }, [shown]);

    return (
        <div className={`path-view${shown ? ' is-showing' : ''}`} aria-hidden={shown ? 'false' : 'true'}>
            <h2 className="path-view__title" ref={titleRef}>{PATH_VIEW.label}</h2>
            <svg className="path-view__scene" ref={svgRef} aria-hidden="true">
                <g className="path-view__line">
                    <path className="path-view__glow" />
                    <path />
                </g>
                <circle className="path-view__end" r="2.5" />
                <circle className="path-view__end" r="2.5" />
                {Array.from({ length: DOT_COUNT }, (_, i) => (
                    <g className="path-view__dot" key={i}>
                        <line />
                        <circle className="path-view__peg" r="1.8" />
                        <circle className="path-view__ball" />
                    </g>
                ))}
            </svg>
            {MILESTONES.map(({ when, what, where }) => (
                <p className="path-view__label" key={when + what}>
                    <span className="path-view__when">{when}</span>
                    <span className="path-view__year">{when.match(/\d{4}/)?.[0] ?? when}</span>
                    <span className="path-view__what">{what}</span>
                    <span className="path-view__where">{where}</span>
                </p>
            ))}
        </div>
    );
}
