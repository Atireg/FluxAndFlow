/**
 * The tap hint's string and its words - "double-click", "pause" or "drop
 * again", by the project's `doubleClick` - drawn like the
 * catalog's spotlight string and name (CatalogTags) but in the dot's black,
 * hanging from the hint's dot. The engine moves them every frame through refs
 * (engine/tags.js); the words are set when a hint appears (App's
 * showTapHint), not through React state.
 */
export default function HintTag({ stringRef, tagRef }) {
    return (
        <>
            {/* The engine writes both paths' `d` and both circles' position, in this order */}
            <svg className="tag-string tag-string--hint" ref={stringRef} aria-hidden="true">
                <path className="tag-string__glow" />
                <path className="tag-string__line" />
                <circle className="tag-string__knot-glow" />
                <circle className="tag-string__knot" />
            </svg>

            <div className="cube-tag cube-tag--spotlight cube-tag--hint" ref={tagRef} aria-hidden="true" />
        </>
    );
}
