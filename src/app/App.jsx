import { useCallback, useEffect, useRef, useState } from 'react';
import { createEngine } from '../engine/index.js';
import { catalogSource } from '../projects/index.js';
import ProjectBar from '../components/ProjectBar.jsx';
import ProjectDrawer from '../components/ProjectDrawer.jsx';
import CatalogTags from '../components/CatalogTags.jsx';
import TapHint from '../components/TapHint.jsx';
import HintTag from '../components/HintTag.jsx';
import CategoryFilter from '../components/CategoryFilter.jsx';
import VelocityTags from '../components/VelocityTags.jsx';
import { emptyWords, hintWords } from './words.js';
import { clearProjectLink, linkedProject, showProjectLink } from './links.js';

// ms after the loader starts to clear that a linked project opens
const LINK_OPEN_AFTER = 1500;

// The elements matching `selector` inside a ref's node, as an array
const nodesIn = (ref, selector) => [...(ref.current?.querySelectorAll(selector) ?? [])];

/**
 * The page.
 *
 * React owns the HTML and the state that changes rarely - which project is
 * open, what the bar says, whether the drawer is pulled out. The engine owns
 * the canvas and everything that changes every frame, and the two meet at the
 * `ui` object below: callbacks out of the engine, a handful of methods back
 * in. Nothing in the render loop goes through React state. See DECISIONS.md.
 *
 * Layers are stacked by z-index, never page order (canvas 1, tags,
 * string and tap hint 2, drawer 3) - Safari has drawn them the other way
 * round. The start-up loader stays inline in index.html, ahead of this
 * module, so it is on screen before React has even downloaded.
 */
export default function App() {
    const [project, setProject] = useState(null);
    const [status, setStatus] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    // The kind of project the catalog has brought forward, or null for all
    const [focus, setFocus] = useState(null);

    const canvasRef = useRef(null);
    const barRef = useRef(null);
    const drawerRef = useRef(null);
    const tapHintRef = useRef(null);
    const hintStringRef = useRef(null);
    const hintTagRef = useRef(null);
    const hintDissolveRef = useRef(null);
    const emptyTagRef = useRef(null);
    const stringRef = useRef(null);
    const spotlightTagRef = useRef(null);
    const velocityRef = useRef(null);
    const engineRef = useRef(null);

    /**
     * On a narrow viewport the drawer's own header takes over the title, so
     * the bar can give that height back - see the 859px query in styles.css.
     */
    useEffect(() => {
        document.body.classList.toggle('drawer-open', drawerOpen);
    }, [drawerOpen]);

    /**
     * The engine is built once, against the canvas React has just mounted.
     * Deliberately outside StrictMode (see main.jsx): one WebGL context on
     * one canvas is not something to tear down and rebuild on every mount.
     */
    useEffect(() => {
        const engine = createEngine({
            canvas: canvasRef.current,
            source: catalogSource,
            ui: {
                onProjectOpen: (opened) => {
                    setProject(opened);
                    showProjectLink(opened.id);
                },

                onProjectClose: () => {
                    setProject(null);
                    clearProjectLink();
                    setDrawerOpen(false);
                    if (drawerRef.current) drawerRef.current.scrollTop = 0;
                },

                onStatus: (message) => setStatus(message ?? null),

                // A sunk pebble was clicked, bringing its kind forward
                onFocus: (category) => setFocus(category),

                // An empty pebble was clicked: a new answer, never the last one again
                onEmptySlot: () => {
                    const tag = emptyTagRef.current;
                    if (tag) tag.textContent = emptyWords(tag.textContent);
                },

                /**
                 * How much of the viewport height the bar occupies, as a
                 * fraction. Only stacked layouts reserve it: side-by-side the
                 * bar sits in the top-left corner, clear of a model framed
                 * into the other half, so reserving its full height across
                 * the whole width would shrink the model for nothing.
                 */
                barFraction: () => {
                    const bar = barRef.current;
                    if (!bar || !bar.classList.contains('is-open')) return 0;

                    return Math.min(bar.offsetHeight / window.innerHeight, 0.5);
                },

                showTapHint: (x, y, action) => {
                    const hint = tapHintRef.current;
                    if (!hint) return;

                    // What the string's tag says (words.js)
                    const tag = hintTagRef.current;
                    if (tag) tag.textContent = hintWords(action);

                    hint.style.left = `${x}px`;
                    hint.style.top = `${y}px`;

                    // Restart the animation even if the last one hasn't finished
                    hint.classList.remove('is-showing');
                    void hint.offsetWidth;
                    hint.classList.add('is-showing');
                },

                hideTapHint: () => {
                    tapHintRef.current?.classList.remove('is-showing');
                },

                overlays: {
                    emptyTag: emptyTagRef.current,
                    spotlightTag: spotlightTagRef.current,
                    spotlightString: stringRef.current,
                    stringPaths: nodesIn(stringRef, 'path'),
                    knots: nodesIn(stringRef, 'circle'),
                    hintDot: tapHintRef.current,
                    hintDissolve: hintDissolveRef.current,
                    hintTag: hintTagRef.current,
                    hintString: hintStringRef.current,
                    hintStringPaths: nodesIn(hintStringRef, 'path'),
                    hintKnots: nodesIn(hintStringRef, 'circle'),
                    velocityTags: nodesIn(velocityRef, '.velocity-tag'),
                },
            },
        });

        engineRef.current = engine;
        engine.start();

        return () => {
            engine.dispose();
            engineRef.current = null;
        };
    }, []);

    /**
     * Links to a project (links.js). One in the address when the page opens
     * opens that project a moment after the loader clears, once the
     * playground has surfaced around it; Back and Forward then close and
     * open it again.
     */
    useEffect(() => {
        let timer = null;
        const openLinked = () => {
            const id = linkedProject();
            if (id && !engineRef.current?.openProject(id)) clearProjectLink();
        };
        const onLeaving = () => { timer = window.setTimeout(openLinked, LINK_OPEN_AFTER); };

        if (linkedProject()) {
            if (document.getElementById('loader')) window.addEventListener('fluxloader:leaving', onLeaving, { once: true });
            else onLeaving();
        }

        const onPopState = () => {
            const id = linkedProject();
            if (id) engineRef.current?.openProject(id);
            else engineRef.current?.closeProject();
        };
        window.addEventListener('popstate', onPopState);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('fluxloader:leaving', onLeaving);
            window.removeEventListener('popstate', onPopState);
        };
    }, []);

    const toggleDrawer = useCallback(() => {
        setDrawerOpen((open) => {
            const next = !open;
            engineRef.current?.setDrawerOpen(next);
            return next;
        });
    }, []);

    const closeProject = useCallback(() => {
        engineRef.current?.closeProject();
    }, []);

    const chooseFocus = useCallback((category) => {
        engineRef.current?.setFocus(category);
        setFocus(category);
    }, []);

    // Escape backs out one step at a time: the drawer first, then the project
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;

            if (drawerOpen) {
                toggleDrawer();
                return;
            }

            closeProject();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [drawerOpen, toggleDrawer, closeProject]);

    return (
        <>
            <canvas className="webgl" ref={canvasRef} />

            <VelocityTags ref={velocityRef} />

            <CatalogTags
                emptyTagRef={emptyTagRef}
                stringRef={stringRef}
                spotlightTagRef={spotlightTagRef}
            />

            {/*
              * After the catalog's tags, so `.tag-string__knot` finds the
              * spotlight's first; the dot after its string, so it sits over
              * the knot
              */}
            <HintTag stringRef={hintStringRef} tagRef={hintTagRef} dissolveRef={hintDissolveRef} />
            <TapHint ref={tapHintRef} />

            <CategoryFilter focus={focus} hidden={Boolean(project)} onChoose={chooseFocus} />

            <ProjectBar
                ref={barRef}
                project={project}
                status={status}
                onClose={closeProject}
            />

            <ProjectDrawer
                ref={drawerRef}
                project={project}
                open={drawerOpen}
                onToggle={toggleDrawer}
            />
        </>
    );
}
