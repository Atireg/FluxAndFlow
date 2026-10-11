import { forwardRef } from 'react';

/**
 * A grey fog that rolls in behind the scene while a project is open: a page
 * layer under the transparent canvas, not three.js fog - see DECISIONS.md.
 */
const Fog = forwardRef(function Fog(props, ref) {
    return <div className="fog" ref={ref} aria-hidden="true" />;
});

export default Fog;
