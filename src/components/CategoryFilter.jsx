import { CATEGORIES } from '../projects/index.js';

/**
 * The catalog's filter: bring one kind of project forward - research,
 * teaching or the real world - and the engine sinks the rest
 * (engine/pebbles/focus.js). Choosing the one already chosen, or "All",
 * brings them all back. Only while the catalog is on screen.
 *
 * Changes only on a click, so it is React state; the engine is told through
 * `onChoose`, and tells it back when a sunk pebble is clicked (`ui.onFocus`).
 */
export default function CategoryFilter({ focus, hidden, onChoose }) {
    const choose = (category) => (event) => {
        // Keep this click off the canvas
        event.stopPropagation();
        onChoose(category === focus ? null : category);
    };

    return (
        <nav className={`filter${hidden ? ' is-hidden' : ''}`} aria-label="Kinds of project" aria-hidden={hidden ? 'true' : 'false'}>
            <button
                className={`filter__choice${focus ? '' : ' is-chosen'}`}
                type="button"
                aria-pressed={String(!focus)}
                onClick={choose(null)}
            >
                All
            </button>
            {CATEGORIES.map(({ id, label }) => (
                <button
                    key={id}
                    className={`filter__choice${focus === id ? ' is-chosen' : ''}`}
                    type="button"
                    aria-pressed={String(focus === id)}
                    onClick={choose(id)}
                >
                    {label}
                </button>
            ))}
        </nav>
    );
}
