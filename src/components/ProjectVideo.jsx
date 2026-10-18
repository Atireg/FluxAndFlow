/**
 * A film in the drawer, from Vimeo, across the drawer's full width above
 * the pictures. Vimeo's own player, so it streams at the right quality for
 * the screen and nothing heavy ships with the site; `dnt=1` asks it not to
 * track the visitor, and it loads only once the drawer is scrolled to it.
 */
export default function ProjectVideo({ video }) {
    const src = `https://player.vimeo.com/video/${video.vimeo}?dnt=1&title=0&byline=0&portrait=0`;

    return (
        <figure className="drawer__video">
            <div className="drawer__frame" style={{ aspectRatio: video.ratio }}>
                <iframe
                    src={src}
                    title={video.title || 'Film'}
                    loading="lazy"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                />
            </div>
            {video.caption && <figcaption>{video.caption}</figcaption>}
        </figure>
    );
}
