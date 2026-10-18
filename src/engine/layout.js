/**
 * How much of the viewport the project drawer covers, per layout. These
 * mirror --panel-fraction in styles.css and the 859px breakpoint there; the
 * detail camera frames the model into whatever space the drawer leaves free.
 */
const PANEL_FRACTION = { side: 0.42, stacked: 0.58 };
const SIDE_PANEL_QUERY = '(min-width: 860px)';

export function layoutMode() {
    return window.matchMedia(SIDE_PANEL_QUERY).matches ? 'side' : 'stacked';
}

/**
 * The drawer only takes room once it is pulled out, so a closed drawer
 * leaves the model the whole canvas.
 */
export function getPanelLayout(drawerOpen) {
    const mode = layoutMode();

    return { mode, fraction: drawerOpen ? PANEL_FRACTION[mode] : 0 };
}
