import { forwardRef, useEffect, useState } from 'react';
import { hasDescription, metaRows } from '../projects/index.js';
import clickOnly from './clickOnly.js';
import ImageViewer from './ImageViewer.jsx';
import ProjectImage from './ProjectImage.jsx';
import ProjectVideo from './ProjectVideo.jsx';

/**
 * A paragraph of the drawer's text, its [words](https://...) made links that
 * open in a new tab - with lists (a `body` entry that is itself an array),
 * the only markup a project's `body` takes
 */
const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
function withLinks(text) {
    const parts = [];
    let from = 0;
    for (const match of text.matchAll(LINK)) {
        parts.push(text.slice(from, match.index));
        parts.push(
            <a key={match.index} className="drawer__link" href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]}</a>
        );
        from = match.index + match[0].length;
    }
    parts.push(text.slice(from));
    return parts;
}

/**
 * The project's description, pulled out from the edge on demand - so by
 * default the model gets the whole canvas, and pulling the drawer out hands
 * part of that back.
 *
 * Every project is rendered by this one component from the fields its own
 * module declares: anything left empty is skipped rather than rendered
 * blank, and a project with nothing written yet gets no handle at all
 * (`is-available`). Several CSS rules key off a section being genuinely
 * empty (`.drawer__meta:empty` and friends), so render nothing rather than
 * whitespace for an empty one.
 */
const ProjectDrawer = forwardRef(function ProjectDrawer({ project, open, onToggle }, ref) {
    const available = hasDescription(project);
    const rows = metaRows(project);
    const [enlarged, setEnlarged] = useState(null);
    const images = project?.images ?? [];
    const pictures = (some) => some.map((image) => (
        <ProjectImage key={image.src || `empty-${images.indexOf(image)}`} image={image} onEnlarge={() => setEnlarged(image)} />
    ));

    // An enlarged picture goes with the drawer, and with the project
    useEffect(() => {
        if (!open) setEnlarged(null);
    }, [open, project]);

    return (
        <aside
            className={`drawer${available ? ' is-available' : ''}${open ? ' is-open' : ''}`}
            id="drawer"
            ref={ref}
            aria-hidden={available ? 'false' : 'true'}
        >
            <button
                className="drawer__handle"
                type="button"
                aria-expanded={String(open)}
                aria-controls="drawer-content"
                onClick={clickOnly(onToggle)}
            >
                <span className="drawer__pulse" aria-hidden="true" />
                <span className="drawer__label">About</span>
                <span className="drawer__chevron" aria-hidden="true">&lsaquo;</span>
            </button>

            <div className="drawer__content" id="drawer-content">
                {/*
                  * Mirrors the bar's title; shown only on narrow viewports,
                  * where the bar's own title hides once the drawer is open
                  * (see styles.css) so the two don't both eat vertical space.
                  */}
                <h2 className="drawer__title">{project?.title ?? ''}</h2>

                <dl className="drawer__meta">
                    {rows.map(({ label, value }) => [
                        <dt key={`${label}-label`}>{label}</dt>,
                        <dd key={`${label}-value`}>{value}</dd>,
                    ])}
                </dl>

                {/* Pictures with an `after` sit in the text, after that entry */}
                <div className="drawer__body">
                    {(project?.body ?? []).map((entry, index) => [
                        Array.isArray(entry)
                            ? <ul key={index}>{entry.map((item, i) => <li key={i}>{withLinks(item)}</li>)}</ul>
                            : <p key={index}>{withLinks(entry)}</p>,
                        images.some((image) => image.after === index) && (
                            <div className="drawer__images drawer__images--in-text" key={`images-${index}`}>
                                {pictures(images.filter((image) => image.after === index))}
                            </div>
                        ),
                    ])}
                </div>

                <div className="drawer__videos">
                    {(project?.videos ?? []).map((video) => <ProjectVideo key={video.vimeo ?? video.youtube} video={video} />)}
                </div>

                <div className="drawer__images">
                    {pictures(images.filter((image) => image.after === null))}
                </div>

                <p className="drawer__credits">{project?.credits ?? ''}</p>
            </div>

            {enlarged && <ImageViewer image={enlarged} onClose={() => setEnlarged(null)} />}
        </aside>
    );
});

export default ProjectDrawer;
