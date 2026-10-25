import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { assetUrl } from '../engine/assets.js';
import clickOnly from './clickOnly.js';
import CloseButton from './CloseButton.jsx';

/**
 * A drawer picture enlarged over the whole page, on paper, with its caption.
 * A click anywhere, its X or Escape puts it back.
 *
 * Portalled to the body: the drawer is moved with a transform, which would
 * make a fixed overlay inside it fixed to the drawer instead of the screen.
 * Escape is caught on the way down (capture) and stopped there, so App's own
 * Escape - which shuts the drawer - doesn't also fire.
 */
export default function ImageViewer({ image, onClose }) {
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;

            event.stopPropagation();
            onClose();
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onClose]);

    return createPortal(
        <div className="image-viewer" role="dialog" aria-modal="true" aria-label={image.alt} onClick={clickOnly(onClose)}>
            <CloseButton className="image-viewer__close" label="Close picture" onClose={onClose} />
            <figure className="image-viewer__figure">
                <img src={assetUrl(image.src)} alt={image.alt} />
                {image.caption && <figcaption>{image.caption}</figcaption>}
            </figure>
        </div>,
        document.body,
    );
}
