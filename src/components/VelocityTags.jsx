import { forwardRef } from 'react';

// More than any pile drops; the engine uses one per aggregate
const POOL = 6;

/**
 * The live speed beside each moving aggregate, for a project with
 * `drop.velocity`. React renders the pool once and hands the nodes to the
 * engine, which places them and writes their text every frame
 * (detail.updateVelocityTags) - never through React state, since they change
 * every frame. Stacked by z-index with the other tags, not page order.
 */
const VelocityTags = forwardRef(function VelocityTags(props, ref) {
    return (
        <div ref={ref} aria-hidden="true">
            {Array.from({ length: POOL }, (_, i) => (
                <div key={i} className="velocity-tag" />
            ))}
        </div>
    );
});

export default VelocityTags;
