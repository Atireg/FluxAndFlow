import { useEffect, useRef, useState } from 'react';
import CloseButton from './CloseButton.jsx';
import DrawerFigure from './DrawerFigure.jsx';

/**
 * A film in the drawer, from Vimeo or YouTube (`vimeo` or `youtube`, the
 * film's number or id), across the drawer's full width above the pictures.
 * YouTube's player comes from youtube-nocookie.com, which sets no cookies
 * until the film is played. Vimeo's own player, so it streams at the right quality for
 * the screen and nothing heavy ships with the site; `dnt=1` asks it not to
 * track the visitor, and it loads only once the drawer is scrolled to it.
 *
 * A phone's Safari can't put an embedded player's frame full screen, only
 * its own video player: `playsinline=0` has the film open in that, full
 * screen, as it starts, and the old webkit/moz attributes cover older
 * browsers. "Watch on Vimeo" below it is the way that always works.
 *
 * On a touch screen a clear sheet lies over the player, so a finger
 * scrolling the drawer across it can't start the film: a tap that hardly
 * moves (TAP_SLOP) lifts the sheet, and the next tap is the player's own.
 *
 * Once a film has been started - the sheet lifted, or a click into the
 * player, seen as the page losing focus to it - an X on its corner closes
 * it: the player loaded afresh, stopped, the sheet back over it.
 */
const TAP_SLOP = 10; // pixels a finger may move and still be tapping
// Where each kind of film plays embedded, and where it opens on its own site
const HOSTS = {
    vimeo: {
        name: 'Vimeo',
        embed: (id) => `https://player.vimeo.com/video/${id}?dnt=1&title=0&byline=0&portrait=0&playsinline=0`,
        page: (id) => `https://vimeo.com/${id}`,
    },
    youtube: {
        name: 'YouTube',
        embed: (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=0`,
        page: (id) => `https://www.youtube.com/watch?v=${id}`,
    },
};

export default function ProjectVideo({ video }) {
    const kind = video.youtube ? 'youtube' : 'vimeo';
    const host = HOSTS[kind];
    const src = host.embed(video[kind]);
    const [armed, setArmed] = useState(false);
    const [started, setStarted] = useState(false);
    const [round, setRound] = useState(0);
    const down = useRef(null);
    const frame = useRef(null);

    // A click into the player takes the focus from the page
    useEffect(() => {
        const onBlur = () => setTimeout(() => {
            if (frame.current && document.activeElement === frame.current) setStarted(true);
        });
        window.addEventListener('blur', onBlur);
        return () => window.removeEventListener('blur', onBlur);
    }, []);

    const close = () => {
        setRound((count) => count + 1);
        setArmed(false);
        setStarted(false);
    };
    const corner = (armed || started) && (
        <CloseButton className="drawer__video-close" label="Close film" onClose={close} />
    );

    const caption = (
        <>
            {video.caption && <>{video.caption} </>}
            <a className="drawer__video-link" href={host.page(video[kind])} target="_blank" rel="noopener noreferrer">
                Watch on {host.name} <span aria-hidden="true">&#x2197;</span>
            </a>
        </>
    );

    return (
        <DrawerFigure className="drawer__video" ratio={video.ratio} caption={caption} corner={corner}>
            <iframe
                key={round}
                ref={frame}
                src={src}
                title={video.title || 'Film'}
                loading="lazy"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                webkitallowfullscreen="true"
                mozallowfullscreen="true"
            />
            {!armed && (
                <div
                    className="drawer__video-shield"
                    aria-hidden="true"
                    onPointerDown={(event) => { down.current = { x: event.clientX, y: event.clientY }; }}
                    onPointerCancel={() => { down.current = null; }}
                    onPointerUp={(event) => {
                        const from = down.current;
                        down.current = null;
                        if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) < TAP_SLOP) setArmed(true);
                    }}
                />
            )}
        </DrawerFigure>
    );
}
