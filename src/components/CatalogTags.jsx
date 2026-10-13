import TagString from './TagString.jsx';

/**
 * The catalog's words on its pebbles.
 *
 * React renders these and hands the nodes to the engine, which places them in
 * screen pixels every frame (engine/tags.js). Their position, opacity and the
 * string's path are never React state: they change every frame, and a
 * re-render per frame is exactly what this must not do. Stacked by z-index,
 * never page order - see DECISIONS.md, "Safari".
 */
export default function CatalogTags({ emptyTagRef, stringRef, spotlightTagRef }) {
    return (
        <>
            {/* The answer to clicking a slot with no project in it yet */}
            <div className="cube-tag cube-tag--empty" ref={emptyTagRef} aria-hidden="true">
                {/* Its words are picked on each click (app/words.js) */}
            </div>

            {/* The string the glowing pebble's name hangs on */}
            <TagString ref={stringRef} />

            {/* The glowing pebble's name, hanging from the string's end */}
            <div className="cube-tag cube-tag--hanging cube-tag--spotlight" ref={spotlightTagRef} aria-hidden="true" />
        </>
    );
}
