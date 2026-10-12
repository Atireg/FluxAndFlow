// A click handler that keeps the click to its own button - off the canvas
// underneath, which would otherwise take it for a click on the scene
export default function clickOnly(action) {
    return (event) => {
        event.stopPropagation();
        action();
    };
}
