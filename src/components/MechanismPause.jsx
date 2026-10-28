import { useState } from 'react';
import { MECHANISM_PAUSE_WORD, MECHANISM_PLAY_WORD } from '../app/words.js';

/**
 * The button beside a mechanism's slider: holds its loop where it is, and
 * sets it going again. React state, since it changes only on a click; keyed
 * by project (with the slider), so each opens playing.
 */
export default function MechanismPause({ onPause }) {
    const [paused, setPaused] = useState(false);
    return (
        <button
            type="button"
            className="section-slider__pause"
            onClick={() => {
                setPaused(!paused);
                onPause(!paused);
            }}
        >
            {paused ? MECHANISM_PLAY_WORD : MECHANISM_PAUSE_WORD}
        </button>
    );
}
