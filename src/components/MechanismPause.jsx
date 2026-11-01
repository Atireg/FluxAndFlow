import { MECHANISM_PAUSE_WORD, MECHANISM_PLAY_WORD } from '../app/words.js';

/**
 * The button beside a mechanism's slider: holds its loop where it is, and
 * sets it going again. Whether it is held is the app's state (`paused`) - a
 * double-tap on the model (`doubleClick: 'pause'`) holds it too - and
 * changes only on a click or a tap.
 */
export default function MechanismPause({ paused, onToggle }) {
    return (
        <button type="button" className="section-slider__pause" onClick={() => onToggle(!paused)}>
            {paused ? MECHANISM_PLAY_WORD : MECHANISM_PAUSE_WORD}
        </button>
    );
}
