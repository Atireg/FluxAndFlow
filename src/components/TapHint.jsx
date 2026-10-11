import { forwardRef } from 'react';

/**
 * A touch point that turns up every few seconds over the open model and taps
 * twice, hinting that a double-click or double-tap zooms in. Placed and
 * started by the engine (detail.js), which is why it takes a ref rather than
 * props: it moves and replays outside React's render.
 */
const TapHint = forwardRef(function TapHint(props, ref) {
    return (
        <div className="tap-hint" ref={ref} aria-hidden="true">
            <span className="tap-hint__ripple" />
            <span className="tap-hint__ripple tap-hint__ripple--second" />
            <span className="tap-hint__dot" />
        </div>
    );
});

export default TapHint;
