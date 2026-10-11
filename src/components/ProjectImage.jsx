import { assetUrl } from '../engine/assets.js';

/**
 * One picture in the drawer, or an empty frame holding its place.
 *
 * The first picture spans the drawer's width and the rest sit two to a row
 * (styles.css), unless `wide` - diagrams whose text is unreadable at half.
 * An entry with no `src` is deliberate: a dashed frame keeping its place
 * until there is a file for it.
 */
export default function ProjectImage({ image }) {
    const empty = !image.src;

    return (
        <figure className={`drawer__image${image.wide ? ' is-wide' : ''}${empty ? ' is-empty' : ''}`}>
            <div
                className="drawer__frame"
                style={{ aspectRatio: image.ratio }}
                aria-hidden={empty ? 'true' : undefined}
            >
                {!empty && <img src={assetUrl(image.src)} alt={image.alt} loading="lazy" />}
            </div>
            {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>
    );
}
