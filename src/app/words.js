/**
 * The page's own small words over the canvas - not a project's content, and
 * not the engine's: it says when to show them, these say what. A "\n" is a
 * line break (the tags keep it, `white-space: pre`).
 */

// What an empty pebble says when clicked, one at random
const EMPTY_WORDS = ['under\nconstruction', 'still\nsettling', 'yet to\ntake shape', 'a grain\nnot yet fallen'];

// Beside the slider that cuts a model across its length (a project's `section`)
export const SECTION_WORD = 'section';

// The filter's last choice: not a kind of project but a view of its own -
// the employment history, as dots on a line (components/PathView.jsx)
export const PATH_VIEW = { id: 'path', label: 'The path' };

// The banner running across the top of the page (the user's words: option 4)
export const BANNER_WORDS = 'Welcome to a living playground – it grows and shifts with its author, and is happily never finished.';

// Over the path's dots, inviting a tap (or a hover)
export const PATH_HINT = 'click me!';

// Beside the path's name: the button to the full CV (src/assets/, PathView.jsx)
export const PATH_CV = { label: 'Full CV' };

// What a double-tap does, by the project's `doubleClick`
const HINT_ACTIONS = { zoom: 'zoom', hold: 'pause', drop: 'drop again', tour: 'play again' };

// A new answer for an empty pebble - never the one it gave last
export function emptyWords(last) {
    const others = EMPTY_WORDS.filter((words) => words !== last);
    return others[Math.floor(Math.random() * others.length)];
}

// The tap hint's two lines: the gesture - a touch screen taps - and what it does
export function hintWords(action) {
    const gesture = window.matchMedia('(hover: none)').matches ? 'double-tap' : 'double-click';
    return `${gesture} to\n${HINT_ACTIONS[action] ?? HINT_ACTIONS.zoom}`;
}
