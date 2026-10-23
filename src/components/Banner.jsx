import { BANNER_WORDS } from '../app/words.js';

/**
 * A thin strip across the top of the page, the same words running slowly
 * by in a loop (the user's: a playground, never finished). Two copies side
 * by side, the track moved by half its width, so the loop has no seam;
 * standing still for those who ask for less motion (styles.css).
 */
export default function Banner() {
    return (
        <div className="banner" role="note" aria-label={BANNER_WORDS}>
            <div className="banner__track" aria-hidden="true">
                {[0, 1].map((copy) => <span className="banner__words" key={copy}>{BANNER_WORDS}</span>)}
            </div>
        </div>
    );
}
