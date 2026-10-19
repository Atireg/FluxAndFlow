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
