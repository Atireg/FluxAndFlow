import { forwardRef } from 'react';
import { categoryLabel } from '../projects/index.js';

/**
 * Always on screen while a project is open: just enough to say what you are
 * looking at and how to get back - and, for a project whose model is dropped
 * with physics (`drop`), a way to drop it again.
 *
 * "Drop again" sits on the same line as the way back on purpose: on a narrow
 * screen the bar's height is reserved out of the model's framing, so a line
 * of its own would move the shot.
 *
 * `status` is the project view's own loading state - and anything that went
 * wrong, so a model that failed to download or a shader that failed to
 * compile says so rather than leaving a blank canvas.
 */
const ProjectBar = forwardRef(function ProjectBar({ project, status, onClose, onReplay }, ref) {
    const open = Boolean(project);
    // Once the model is in - nothing to drop while it's still loading
    const canReplay = Boolean(project?.drop) && !status;

    return (
        <header className={`bar${open ? ' is-open' : ''}`} ref={ref} aria-hidden={open ? 'false' : 'true'}>
            <button
                className="bar__back"
                type="button"
                onClick={(event) => {
                    // Keep this click to the button itself
                    event.stopPropagation();
                    onClose();
                }}
            >
                <span className="bar__back-arrow" aria-hidden="true">&larr;</span> F&amp;F playground
            </button>

            {canReplay && (
                <button
                    className="bar__back bar__replay"
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onReplay();
                    }}
                >
                    <span className="bar__replay-icon" aria-hidden="true">&#x21BB;</span> Drop again
                </button>
            )}

            {/*
              * Its kind as a tag after the name, on the same line - a line of
              * its own would make the bar taller, and on a narrow screen its
              * height is taken out of the model's framing
              */}
            <h1 className="bar__title">
                {project?.title ?? ''}
                {project && <>{' '}<span className="bar__category">{categoryLabel(project.category)}</span></>}
            </h1>
            <p className="bar__status" role="status">{status ?? ''}</p>
        </header>
    );
});

export default ProjectBar;
