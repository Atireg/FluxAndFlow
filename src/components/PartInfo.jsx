import { forwardRef } from 'react';

/**
 * What a project says about the part of its model under the pointer (its
 * `info`): a title and a few lines, beside the pointer. Filled and placed by
 * the engine (detail.js's hover) through App's `ui.showPartInfo`, which is
 * why it takes a ref rather than props - it changes as the pointer moves,
 * outside React's render.
 */
const PartInfo = forwardRef(function PartInfo(props, ref) {
    return (
        <div className="part-info" ref={ref} aria-live="polite">
            <p className="part-info__title" />
            <ul className="part-info__lines" />
        </div>
    );
});

export default PartInfo;
