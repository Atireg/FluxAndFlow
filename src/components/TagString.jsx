import { forwardRef } from 'react';

/**
 * A string a tag hangs on: a faint glow under a fine line, and a dot where
 * it's tied on - the catalog's spotlight string and the tap hint's. The
 * engine writes both paths' `d` and both circles' position, in this order
 * (drawRope in engine/tags.js), so keep it.
 */
const TagString = forwardRef(function TagString({ className = '' }, ref) {
    return (
        <svg className={`tag-string${className ? ` ${className}` : ''}`} ref={ref} aria-hidden="true">
            <path className="tag-string__glow" />
            <path className="tag-string__line" />
            <circle className="tag-string__knot-glow" />
            <circle className="tag-string__knot" />
        </svg>
    );
});

export default TagString;
