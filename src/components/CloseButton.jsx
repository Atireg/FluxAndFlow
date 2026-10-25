import clickOnly from './clickOnly.js';

/**
 * A small round X that puts something back: an enlarged picture
 * (ImageViewer), a film that has been started (ProjectVideo)
 */
export default function CloseButton({ className, label, onClose }) {
    return (
        <button className={`close-button ${className}`} type="button" aria-label={label} onClick={clickOnly(onClose)}>
            <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 2 10 10M10 2 2 10" />
            </svg>
        </button>
    );
}
