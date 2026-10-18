/**
 * One figure in the drawer - a picture or a film: a frame held at the
 * content's `ratio` so nothing jumps as it loads, and a caption under it
 * when there's anything to say. ProjectImage and ProjectVideo fill it.
 */
export default function DrawerFigure({ className, ratio, frameHidden, caption, children }) {
    return (
        <figure className={`drawer__figure ${className}`}>
            <div className="drawer__frame" style={{ aspectRatio: ratio }} aria-hidden={frameHidden ? 'true' : undefined}>
                {children}
            </div>
            {caption && <figcaption>{caption}</figcaption>}
        </figure>
    );
}
