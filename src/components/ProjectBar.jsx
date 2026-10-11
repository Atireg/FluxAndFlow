import { forwardRef } from 'react';

/**
 * Always on screen while a project is open: just enough to say what you are
 * looking at and how to get back.
 *
 * `status` is the project view's own loading state - and anything that went
 * wrong, so a model that failed to download or a shader that failed to
 * compile says so rather than leaving a blank canvas.
 */
const ProjectBar = forwardRef(function ProjectBar({ project, status, onClose }, ref) {
    const open = Boolean(project);

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
                <span className="bar__back-arrow" aria-hidden="true">&larr;</span> All projects
            </button>

            <h1 className="bar__title">{project?.title ?? ''}</h1>
            <p className="bar__status" role="status">{status ?? ''}</p>
        </header>
    );
});

export default ProjectBar;
