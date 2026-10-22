import { useEffect, useRef } from 'react';
import { PATH_VIEW } from '../app/words.js';

/**
 * "The path": the employment history, as a washing line under the view's
 * name with DOT_COUNT dots pegged on it - the tap hint's dot, white with a
 * black outline - each on a short thread. The line bellies and lifts in the
 * wind; each dot swings on its thread as a damped pendulum pushed by the
 * same wind where it hangs, so neighbours move alike but never in lockstep.
 *
 * Moves every frame, so never through React state: its own frame loop
 * writes the SVG through refs, and only while it is on screen.
 */
const DOT_COUNT = 10;
const SAG = 0.05; // the line's belly, as a share of its length
const LIFT = 0.35; // how much of the belly the wind lifts and drops
const THREAD = 1.6; // a thread's length, in dot sizes
const SWING = 6.3; // gravity over thread length: a swing of about 2.5s
const DAMPING = 0.7;
const PUSH = 5; // how far the wind pushes a dot round
const MAX_STEP = 1 / 30; // a stalled frame holds the swing rather than flinging it

// The wind at `share` along the line at `t` seconds: a steady breeze, a slow
// gust and a quicker flutter that travels along it
function wind(share, t) {
    return 0.12
        + 0.1 * Math.sin(0.31 * t)
        + 0.06 * Math.sin(0.83 * t + share * 2.4)
        + 0.03 * Math.sin(1.9 * t - share * 7);
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
        const [glow, line] = svg.querySelectorAll('.path-view__line path');
        const knots = svg.querySelectorAll('.path-view__end');
        const dots = [...svg.querySelectorAll('.path-view__dot')].map((group) => ({
            thread: group.querySelector('line'),
            peg: group.querySelector('.path-view__peg'),
            dot: group.querySelector('.path-view__ball'),
            angle: 0,
            speed: 0,
        }));
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let frame = 0;
        let last = performance.now();

        const draw = (now) => {
            const t = now / 1000;
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
            const belly = SAG * length * (1 + (still ? 0 : LIFT * Math.sin(0.6 * t) * (0.6 + wind(0.5, t))));

            // Where the line is at `share` along it: a belly, and a small
            // ripple running along it
            const at = (share) => {
                const ripple = still ? 0 : 0.012 * length * Math.sin(Math.PI * share) * Math.sin(1.3 * t - share * 5);
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
                if (!still) {
                    const pull = -SWING * Math.sin(hung.angle) - DAMPING * hung.speed + PUSH * wind(share, t);
                    hung.speed += pull * step;
                    hung.angle += hung.speed * step;
                }

                const [x, y] = at(share);
                const reach = THREAD * size;
                const cx = x + Math.sin(hung.angle) * (reach + size / 2);
                const cy = y + Math.cos(hung.angle) * (reach + size / 2);
                hung.peg.setAttribute('cx', x);
                hung.peg.setAttribute('cy', y);
                hung.thread.setAttribute('x1', x);
                hung.thread.setAttribute('y1', y);
                hung.thread.setAttribute('x2', x + Math.sin(hung.angle) * reach);
                hung.thread.setAttribute('y2', y + Math.cos(hung.angle) * reach);
                hung.dot.setAttribute('cx', cx);
                hung.dot.setAttribute('cy', cy);
                hung.dot.setAttribute('r', size / 2);
                hung.dot.style.strokeWidth = Math.max(1.5, size * 0.08);
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
        </div>
    );
}
