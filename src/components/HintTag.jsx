import TagString from './TagString.jsx';

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
            <TagString className="tag-string--hint" ref={stringRef} />

            <div className="cube-tag cube-tag--spotlight cube-tag--hint" ref={tagRef} aria-hidden="true" />
        </>
    );
}
