/**
 * What the devices made in code (tools/models/ - the laptop, the phone) share
 * as projects: drawn as themselves in light grey rather than as points
 * (`solid`, screen [r, g, b] where it faces the light and where it turns
 * away), not turning by themselves or by hand, the screen square on, and the
 * pebble's points circling on that screen like a loading sign while its
 * film loads (`screen`, the name of each model's screen mesh). Spread into
 * a project: `...DEVICE`.
 */
export const DEVICE = {
    solid: { lit: [222, 222, 220], shade: [160, 160, 162] },
    still: true,
    orbit: false,
    screen: 'Screen',
};

/**
 * ...and how they're seen: square-on from a little above (`turn: -90` undoes
 * the detail view's quarter turn, so the front faces the camera), then in on
 * the screen as the film starts (`fillScreen`), the whole device again with
 * the About drawer out. Spread into a project's view with its own `zoom` and
 * `lift`: `view: { ...DEVICE_VIEW, zoom, lift }`.
 */
export const DEVICE_VIEW = {
    elevation: 15,
    turn: -90,
    fillScreen: 1.05,
    drawer: 'whole',
};
