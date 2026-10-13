import TagString from './TagString.jsx';

/**
 * The tap hint's string and its words - "double-click", "pause" or "drop
 * again", by the project's `doubleClick` - drawn like the
 * catalog's spotlight string and name (CatalogTags) but in the dot's black,
 * hanging from the hint's dot. The engine moves them every frame through refs
 * (engine/tags.js); the words are set when a hint appears (App's
 * showTapHint), not through React state.
 */
export default function HintTag({ stringRef, tagRef, dissolveRef }) {
    return (
        <>
            {/*
              * The hint's dissolve, like the aggregates' (pointcloud/mesh.js):
              * a fixed speckle of noise, and everything under a rising
              * threshold dropped - it breaks up into specks rather than fading.
              * The engine raises the threshold through the transfer's
              * intercept (engine/tags.js, HINT_DISSOLVE).
              */}
            <svg className="hint-dissolve" aria-hidden="true" focusable="false">
                <filter id="hint-dissolve" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="1" seed="7" result="noise" />
                    <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="speckle" />
                    <feComponentTransfer in="speckle" result="mask">
                        <feFuncA ref={dissolveRef} type="linear" slope="16" intercept="0" />
                    </feComponentTransfer>
                    <feComposite in="SourceGraphic" in2="mask" operator="in" />
                </filter>
            </svg>

            <TagString className="tag-string--hint" ref={stringRef} />

            <div className="cube-tag cube-tag--spotlight cube-tag--hint" ref={tagRef} aria-hidden="true" />
        </>
    );
}
