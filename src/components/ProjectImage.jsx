import { assetUrl } from '../engine/assets.js';
import clickOnly from './clickOnly.js';
import DrawerFigure from './DrawerFigure.jsx';

/**
 * One picture in the drawer, or an empty frame holding its place.
 *
 * The first picture spans the drawer's width and the rest sit two to a row
 * (styles.css), unless `wide` - diagrams whose text is unreadable at half.
 * An entry with no `src` is deliberate: a dashed frame keeping its place
 * until there is a file for it. A picture is a button: clicked, it opens
 * enlarged (`onEnlarge`, ImageViewer).
 */
export default function ProjectImage({ image, onEnlarge }) {
    const empty = !image.src;

    return (
        <DrawerFigure
            className={`drawer__image${image.wide ? ' is-wide' : ''}${image.pair ? ' is-pair' : ''}${empty ? ' is-empty' : ''}`}
            ratio={image.ratio}
            frameHidden={empty}
            caption={image.caption}
        >
            {!empty && (
                <button className="drawer__enlarge" type="button" aria-label="Enlarge picture" onClick={clickOnly(onEnlarge)}>
                    <img src={assetUrl(image.src)} alt={image.alt} loading="lazy" />
                </button>
            )}
        </DrawerFigure>
    );
}
