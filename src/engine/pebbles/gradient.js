import { screenColor } from '../colors.js';

/**
 * Gradient colour across a pebble's face - an exploration, behind a flag.
 *
 * The graphite shading (see addGraphite) puts all of its tone in the
 * ALPHA: `outgoingLight` is one flat colour and `diffuseColor.a` is how
 * heavily the pebble is shaded over the paper. That is what makes it read
 * as pencil rather than as a lit solid. So a gradient here does not touch
 * the shading at all - it only lets the colour being laid down vary across
 * the surface, and the existing tone still rides on top of it.
 *
 * Off by default: `?pebbles=<name>` picks one, so the options can be
 * compared on the live site (the same way `?loaderpreview` was used to
 * choose the loader's palette, then removed). **This flag is temporary** -
 * once a look is chosen it becomes the default and the flag goes.
 *
 * The face only. The rim is a near-black silhouette a pixel or two wide,
 * where a gradient would not read, and it already carries the spotlight's
 * colour signal.
 */

/**
 * Where the gradient runs. Each is an expression over what the graphite
 * patch has already worked out, so they cost nothing extra:
 *
 *   graphiteLit    1 facing the light (upper left), 0 facing away
 *   graphiteEdge   0 facing the eye, 1 at the silhouette
 *   vPebbleFlux    the shape wave at this point, about -1..1
 *   vPebbleWorld   where this point is in the scene
 *
 * Kept inside defined GLSL - no reversed smoothstep, no pow(0, y) - since
 * Safari can't be tested here (see DECISIONS.md, "Safari").
 */
const AXES = {
    // Deepest where the light doesn't reach: a second colour in the shadow,
    // the way a red chalk drawing warms as it darkens
    shadow: '(1.0 - graphiteLit)',

    // Only at the silhouette: faces stay graphite, the turn away warms
    rim: 'graphiteEdge',

    // One gradient laid across the whole catalog, each pebble sampling the
    // part of it that it sits in - the grid as a single field rather than
    // ten separately-coloured stones. Diagonal, so a row isn't uniform.
    field: 'clamp((vPebbleWorld.x * 0.85 + vPebbleWorld.z * 0.53) / uGradientSpan * 0.5 + 0.5, 0.0, 1.0)',

    // Follows the flux: the colour drifts over the pebble as its shape
    // breathes, so the gradient is never still
    flux: 'clamp(vPebbleFlux * 0.5 + 0.5, 0.0, 1.0)',
};

/**
 * The far end of each gradient.
 *
 * Kept inside the inks the site already uses - the point clouds' dark red
 * and warm grey (POINT_INKS) - so the catalog and the project view read as
 * one set. Two colours are deliberately NOT offered:
 *
 *   orange  one orange means "click me" (the spotlight and the About
 *           handle). A pebble that is partly orange at rest spends that.
 *   teal    "the blue isn't right" - teal glass, a teal hover tint and a
 *           single teal ink have all been tried and taken out.
 */
const SANGUINE = screenColor(128, 24, 36); // the clouds' dark red
const WARM_GREY = screenColor(120, 116, 110); // the clouds' warm grey
const BISTRE = screenColor(92, 74, 62); // a warm brown-grey, between the two

/**
 * The options. `amount` is how far the colour travels at the far end -
 * generous rather than shy, because every previous subtle-first pass here
 * came back as "too subtle" (PEBBLE_FLUX went 0.09 -> 0.15 -> 0.3).
 */
export const PEBBLE_GRADIENTS = {
    // Graphite, warming to red chalk where the light falls away. The
    // strongest of these, and the most like a drawing.
    sanguine: { axis: 'shadow', to: SANGUINE, amount: 0.55 },

    // Graphite faces, a warm red turn at the silhouette only. The quietest
    // that still reads: the rim is a narrow band of the visible surface, so
    // it needs a far colour to show at all.
    edge: { axis: 'rim', to: SANGUINE, amount: 0.9 },

    // The whole grid as one wash, each pebble sampling the part it sits in.
    // Warm grey was too near graphite to register across that distance.
    field: { axis: 'field', to: BISTRE, amount: 0.8 },

    // Each pebble's warmth drifting with its own shape waves - closer to ten
    // pebbles in slowly-changing tones than to a gradient across one.
    breath: { axis: 'flux', to: BISTRE, amount: 0.85 },

    // A field wash that also deepens into shadow
    both: { axis: 'shadow', to: SANGUINE, amount: 0.45, also: { axis: 'field', to: BISTRE, amount: 0.55 } },
};

/**
 * `uGradientSpan` is shared by every pebble's material, like the flux's
 * clock: the catalog sets it to the grid's half-extent after laying out, so
 * the `field` wash spans exactly the pebbles that exist however they are
 * arranged.
 */
export const gradientSpan = { value: 1 };

// How far the field axis reaches, for the span above
export function fieldReach(x, z) {
    return Math.abs(x * 0.85 + z * 0.53);
}

/**
 * Which option this page is showing, from `?pebbles=`, resolved into the
 * layers the shader needs. An unknown name is ignored rather than throwing -
 * it's a preview flag, not a setting. Null means the plain flat graphite,
 * and then nothing below is spliced in at all, so the default program is
 * byte-for-byte what it was.
 */
export function chosenGradient() {
    if (typeof window === 'undefined') return null;

    const name = new URLSearchParams(window.location.search).get('pebbles');
    if (!name || name === 'off') return null;

    const option = PEBBLE_GRADIENTS[name];
    if (!option) return null;

    const steps = [option, ...(option.also ? [option.also] : [])];

    return {
        name,
        layers: steps.map((step, index) => ({
            axis: step.axis,
            amount: step.amount,
            color: step.to,
            uniform: `uGradientTo${index}`,
        })),
    };
}

// The GLSL the graphite patch splices in, one mix per layer
export function gradientGlsl(gradient) {
    return gradient.layers
        .map((layer) => `diffuseColor.rgb = mix(diffuseColor.rgb, ${layer.uniform}, ${layer.amount.toFixed(3)} * (${AXES[layer.axis]}));`)
        .join('\n');
}

// Declared ahead of the fragment's main(), alongside what the vertex sends
export function gradientUniformsGlsl(gradient) {
    return [
        ...gradient.layers.map((layer) => `uniform vec3 ${layer.uniform};`),
        'uniform float uGradientSpan;',
        'varying float vPebbleFlux;',
        'varying vec3 vPebbleWorld;',
    ].join('\n');
}
