import DrawerFigure from './DrawerFigure.jsx';

/**
 * A film in the drawer, from Vimeo, across the drawer's full width above
 * the pictures. Vimeo's own player, so it streams at the right quality for
 * the screen and nothing heavy ships with the site; `dnt=1` asks it not to
 * track the visitor, and it loads only once the drawer is scrolled to it.
 *
 * A phone's Safari can't put an embedded player's frame full screen, only
 * its own video player: `playsinline=0` has the film open in that, full
 * screen, as it starts, and the old webkit/moz attributes cover older
 * browsers. "Watch on Vimeo" below it is the way that always works.
 */
export default function ProjectVideo({ video }) {
    const src = `https://player.vimeo.com/video/${video.vimeo}?dnt=1&title=0&byline=0&portrait=0&playsinline=0`;

    const caption = (
        <>
            {video.caption && <>{video.caption} </>}
            <a className="drawer__video-link" href={`https://vimeo.com/${video.vimeo}`} target="_blank" rel="noopener noreferrer">
                Watch on Vimeo <span aria-hidden="true">&#x2197;</span>
            </a>
        </>
    );

    return (
        <DrawerFigure className="drawer__video" ratio={video.ratio} caption={caption}>
            <iframe
                src={src}
                title={video.title || 'Film'}
                loading="lazy"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                webkitallowfullscreen="true"
                mozallowfullscreen="true"
            />
        </DrawerFigure>
    );
}
