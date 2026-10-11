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
                Still empty...
            </div>

            {/*
              * The tag's string: a faint glow under a fine line, and a dot
              * where it's tied on. The engine writes both paths' `d` and both
              * circles' position, in this order.
              */}
            <svg className="tag-string" ref={stringRef} aria-hidden="true">
                <path className="tag-string__glow" />
                <path className="tag-string__line" />
                <circle className="tag-string__knot-glow" />
                <circle className="tag-string__knot" />
            </svg>

            {/* The glowing pebble's name, hanging from the string's end */}
            <div className="cube-tag cube-tag--spotlight" ref={spotlightTagRef} aria-hidden="true" />
        </>
    );
}
