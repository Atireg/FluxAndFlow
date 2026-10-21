import { SECTION_WORD } from '../app/words.js';

/**
 * A project's section (`section`): a slider over the model that moves a cut
 * across its length, through `onSlide` straight to the engine - not through
 * React state, since it changes with every step of the drag. All the way to
 * the right, the whole model; keyed by project, so each opens uncut.
 */
export default function SectionSlider({ onSlide }) {
    return (
        <label className="section-slider">
            <span className="section-slider__word">{SECTION_WORD}</span>
            <input
                className="section-slider__range"
                type="range"
                min="0"
                max="1000"
                defaultValue="1000"
                onInput={(event) => onSlide(Number(event.currentTarget.value) / 1000)}
            />
        </label>
    );
}
