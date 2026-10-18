Decisions
=========

Why things are the way they are, where the code alone would not say: what
was chosen, over what, and what would have to change to revisit it. Read
the relevant entry before changing the camera, the colours, the point-cloud
pipeline or the drawer. Things built and then taken out are listed at the
end, under "Tried and removed", so they aren't re-proposed blind.


Contents
--------

The catalog (the grid of pebbles - "cubes" in the code)
- Pebbles, and a clicked one dissolves into points
- A fixed number of slots
- A pebble's state is a pure function of its mode and the clock
- The spotlight: any pebble, held still, in the one orange
- The glowing pebble's name hangs on a string
- The pointer stirs the grid; the grid doesn't orbit
- Every pebble holds its thumbnail - the rock, or the project's own model
- "Under construction", and tags as HTML over the canvas
- Selecting: pointerup on the canvas, and drags don't count
- The grid arrives, a pebble at a time
- Clicking a project knocks the rest of the grid off the screen
- A pebble's colour drifts with its shape
- Three kinds of project, and bringing one forward

The project view: camera
- The detail camera looks along the catalog's screen-up; every move slerps
- The default view, and a project's own `view`
- Fitting allows for depth and for what else is on screen
- The open drawer: the whole model beside it, or a close-up below it
- The model turns; the camera nods (`view.sway`)
- Double-click / double-tap zoom, and the touch-point hint
- Timed zooms on Rock Print (`autoZoom`), holding it, from inside

The project view: point cloud
- Quantized, not Draco-compressed
- A mesh becomes points as it loads
- kh-reuse: a solid laptop that stands still
- Emergent Space: aggregates dropped with live physics
- Point size, three sizes, three inks
- Points gather out of a scattered cloud
- Tails behind moving points
- Safari: defined GLSL, visible failures

Page, colour and drawer
- The whole site is paper
- Scene fog is off; the grey fog is a page layer
- Faded faces don't write depth
- No description, no drawer
- The bar's title moves into the drawer on a phone
- Drawer pictures
- Asset paths resolve against the Vite base URL

Loading
- The landing page, then the loader, on one field of particles
- The start-up loader is inline and waits for real progress
- Why clouds load on click
- A link to each project

How the code is laid out
- React owns the page; the engine owns the canvas
- Every project is one module behind one schema
- Shared mutable state is one object, passed in
- Constants live next to what they tune

Tried and removed


The catalog
===========


Pebbles, and a clicked one dissolves into points
------------------------------------------------

Chosen from five rendered options (pebbles, bubbles, morphing blobs,
rounded cubes, clouds of points): pebbles in the grid that turn into a
cloud of points when clicked. The code says `pebble` throughout, but
the grid unit is still `CUBE_SIZE`, the rim `userData.edges` and the CSS
classes `.cube-tag` - cube-era names left as they are.

- **Shape** (`makePebbleGeometry(seed, size)`): a sphere of `PEBBLE_RADIUS`
  (0.44 x `CUBE_SIZE`), wobbled by a few slow waves (`PEBBLE_LUMPS`), drawn out
  a little (`PEBBLE_STRETCH`), squashed flat (`PEBBLE_SQUASH`); a seed per
  slot. Vertices are merged first so normals are smooth.
- **Sizes**: each pebble is drawn `PEBBLE_SIZE_MIN`..`PEBBLE_SIZE_MAX` (1 to
  1.8) times that, picked at random on every visit (`cube.userData.size`); the
  larger ones reach into their neighbours and push them aside (see "Bumps",
  below the flow). The size goes into the geometry, not `cube.scale`: the
  pebble parents the project's model once it opens, and its scale is held at 1
  there (and pulses only for the spotlight). Everything sized off the pebble
  multiplies by it - the flux amount, the thumbnail (`contentBaseScale`), the
  tag's anchors - and `framing.fitToGrid` frames each edge pebble at its own
  size, so a big one on the edge stays on screen.
- **Graphite, not glass** (`addGraphite`): asked for - "the blue isn't
  right". First a pencil sketch: graphite hatching, crossing strokes, a
  grainy outline; the user then kept the colour and dropped the strokes. The
  face is now a smooth graphite shade over the paper, from a fixed
  upper-left light and darker towards the silhouette - not the scene's
  lighting, whose cyan lights would tint it blue. The rim is a plain
  graphite outline; the contents (rock, Emergent Space's aggregate) are
  graphite too (`THUMB_INK`). The material's colour, emissive and opacity
  mean what they did - graphite, the spotlight's orange, how heavily it's
  shaded (`GRAPHITE_WEIGHT`, with an orange wash at the glow's peak) - so
  paintGlow, the fades and the arrival work unchanged. Before this: pale
  teal glass with teal rims.
- **Flux**: each pebble slowly changes shape, as asked - three broad waves
  rolling over its surface on its own seed (`addPebbleFlux`, in the vertex
  shader; `PEBBLE_FLUX` 30% of the radius - 9% and then 15% read as too
  subtle - `PEBBLE_FLUX_SPEED`), off one shared clock (`pebbleFluxTime`).
  The glass and the rim run the same function on the same seed, or the rim
  would slip off the glass. Pure function of time; clicks and hover still
  use the resting shape, near enough. The dissolve starts from the shape at
  the click (the same function, its clock held at `dropStartedAt`) - at
  30% the resting shape was visibly a different pebble.
- **Rim, not edges.** `userData.edges` is a second skin on the same
  geometry (`makeRimMaterial`, a MeshBasicMaterial with a fresnel term
  patched in), opaque only at the silhouette. It keeps the edge lines'
  `.color` / `.opacity`, so the spotlight, hover and every fade drive it
  unchanged.
- **Dissolve** (`getDissolve`, built once per pebble): on click the glass,
  rim and rock fade over `DISSOLVE_FADE` while `DISSOLVE_POINTS` points on
  the surface swell, drift and turn from teal to the project's inks, gone by
  `DISSOLVE_DURATION` (3.6s) - in the same place as the project's own
  gather, so one cloud reads as becoming the other. Pure function of time
  since the click (`updateDissolve`); closing hides it.
- **A handover, not an overlap.** At full strength both clouds on top of
  each other looked muddy, so once the project's points appear they fade
  in over `REVEAL_DURATION` (1s, `uReveal` in the cloud's shader, from
  `revealAt`) while the dissolve's fade out over the same second. If the
  model is still downloading, the dissolve simply runs on.
- **No frame in the project view.** The pebble has dissolved; the project
  stands alone in the fog. Framing still fits the invisible `CUBE_SIZE` box.
- **Visited pebbles stay darker**, like visited links: once its project has
  been opened (`markVisited` in `openProject`; "under construction" doesn't
  count), a pebble rests in deeper glass with a darker rim. Every state
  that rests or glows takes its base from `restingFaceColor` /
  `restingFaceOpacity` / `restingRimColor`, so nothing writes a resting
  colour back directly. Ids are kept in `localStorage` (`fluxandflow.visited`); where
  storage is blocked it lasts for the visit.


A fixed number of slots
-----------------------

`SLOT_COUNT = 10` decides how many pebbles exist; the viewport only decides
the arrangement (`computeGridShape` picks the column count closest to the
viewport's proportions, `framing.fitToGrid` frames it). Sizing the grid from
the viewport instead gave 0 pebbles on a portrait phone. A project's `slot`
is stable; its on-screen place isn't, but the order is row-major. Pebbles
sit `SPACING` (1.4) `CUBE_SIZE`s apart, centre to centre - 1.2 felt crowded;
`fitToGrid` pulls back to fit whatever the spacing, so they get
smaller on screen as it grows.


A pebble's state is a pure function of its mode and the clock
-------------------------------------------------------------

Every frame each pebble's whole state - pose, colour, opacity, its rock's
scale - is computed fresh from its mode and the clock (`engine/catalog.js`:
the idle and spotlight modes, and the grid-wide `'dropping'` and
`'returning'` modes). Nothing accumulates, so nothing drifts or needs resetting. Colour
goes through `paintGlow(pebble, amount)`: 0 is the pebble's resting self, 1
the spotlight's orange.

**Hover changes nothing**: the pebble under the pointer keeps its look and
its float, to be clicked; the spotlight just never starts on it. The
exceptions with memory are the pointer's flow and the hanging tag.

Two traps it sets, both hit for real:

- **A per-frame write beats a one-off tween on the same property.** Closing
  once flipped straight back to `'catalog'`, whose idle update rewrote
  opacity every frame and stomped the reveal's fade. `state.view` stays
  `'returning'` until the reveal's tweens finish.
- **The clicked pebble carries whatever the click caught it holding** into
  the project view, so `openProject` zeroes its rotation and scale and
  resets its colours and emissive.


The spotlight: any pebble, held still, in the one orange
--------------------------------------------------------

Every ~5.3-5.6s one pebble glows orange and jumps, then the next.

- **Any pebble is eligible**, empty slots included - it's the grid's
  ambient life, not only a call to action. Never the hovered one or the one
  that just finished.
- **It holds still where its float had it** while it jumps; its pose is
  blended with the live float by the spotlight's intensity (eased in over
  `SPOTLIGHT_FADE_IN`, out over `SPOTLIGHT_FADE_OUT`), so it leaves and
  rejoins the float without a snap.
- **One orange for "click me"**, `#ff8c32`: the glowing pebble and the
  About handle (`--warm`; `SPOTLIGHT_GLOW_COLOR` kept in step by hand).
- **Showing that orange took two things.** Colours are given as raw screen
  values (`screenColor()`), because the renderer outputs linear values and a
  hex string is converted on the way in (it came out brick red). And the
  face glows through its emissive colour, since the scene's cyan lights turn
  an orange base green; the base is dimmed as the glow rises
  (`SPOTLIGHT_FACE_DIM`). Every reset of a face colour resets emissive too.


The glowing pebble's name hangs on a string
-------------------------------------------

The spotlight's tag (`.cube-tag--spotlight`, in `CatalogTags`) reads the project's `title` ("Rock Print Pavilion",
"Emergent Space"), or "Project 03".."Project 10" for an empty slot, and
pulses with the glow (down to `SPOTLIGHT_TAG_MIN`, 0.65, between beats - at
0.2 it read as see-through), gone once the pebble settles. Hovering it
changes nothing - the spotlight runs its whole dwell. "under construction" wins
on its pebble.

**Size**: the tags scale with the pebbles on screen - `--pebble-px`, their
radius in pixels, set by `framing.fitToGrid` - at 0.3 of it, never under
0.95rem. A phone (radius ~49px) stays as it was; 1280px wide gets ~22px,
1920 ~30px. A fixed rem looked small on wide screens.

**Above the pebbles**: the tags and the string are `z-index` 2, over the
canvas (1) - see "Safari".

It hangs below the pebble on the paper, because on the face it was orange
on orange (`hangSpotlightTag`). The string is a simulated rope in screen
pixels - a straight pendulum read as a rod: `ROPE_SEGMENTS` Verlet points
with `TAG_GRAVITY` and `TAG_DAMPING`, link lengths held over
`ROPE_ITERATIONS` passes, the knot pinned just inside the pebble's lower rim
and the tag a light end (`TAG_WEIGHT`), with slight bending stiffness
(`ROPE_STIFFNESS`, once a step - every pass made it rigid). It swings in a
gusty wind (`wind(t)`: gusts that swell and die away at `TAG_GUST`, each
with a quicker flutter, mostly from one side), felt by the tag as well as
the string and arriving a moment later further down (`TAG_WAVE_LAG`), so it
ripples; off under reduced motion. A heavy tag, strong damping and a
string-only breeze kept it taut and read as stiff. Drawn as one Catmull-Rom
curve (`.tag-string`), by the same `createRope` / `drawRope` the tap
hint's string uses. The tag turns with the string's overall lean,
not just its last link (which spun it whenever the end kinked); the knot is
spread across steps and the swing capped at `TAG_MAX_SWING` (~55 degrees),
or a slow frame flips it. Text is `--warm-text`, a shade deeper than
`--warm` for legibility on paper, with a soft paper halo. A dot marks the
knot (`TAG_KNOT_SIZE` of the pebble's radius, 2-6px), in `--warm-text` so
it shows on the glowing pebble - in `--warm` it vanished there. The string
is the lighter `--warm`, solid, over a faint wider glow: softer than a 1px
line in the text's orange, which read as drawn on. A see-through string
fading in from the knot was tried and looked lost behind the pebbles.


The pointer stirs the grid; the grid doesn't orbit
--------------------------------------------------

- **No orbit** in the catalog: `controls.enabled` is false there. Its
  `update()` still runs every frame - `moveCamera` relies on it.
- **Float**: a wander (`WANDER_XZ_AMPLITUDE`) with a gentle rock
  (`WANDER_TILT`), kept under half the gap so neighbours don't meet.
- **Flow**: pointer motion carries nearby pebbles along like a hand through
  water - velocity times `FLOW_CARRY`, Gaussian falloff (`FLOW_RADIUS`),
  capped (`FLOW_MAX`), on an under-damped spring, in fixed steps. Only
  motion pushes, so a resting cursor leaves the pebble it's aiming at
  alone. Zeroed by `resetFlow()` when the drop starts (`pebbles/flow.js`).
- **Bumps**: pebbles that touch push each other apart (`bumpPebbles`, asked for
  once their random sizes made big ones overlap). The push goes into the same
  spring state as the flow, so it is integrated in the same steps and they lean
  the way they're shoved: in proportion to the overlap seen from above (as the
  camera sees them - their heights differ), the bigger, heavier one giving way
  less, reach `BUMP_REACH` of the radius times the pebble's scale, so the
  spotlight's pulse shoves its neighbours. `BUMP_STIFFNESS` is 140, against the
  pull home's 28: at 40 big neighbours sank well into each other, and the user
  asked for more repelling - now they keep about a tenth of the overlap, push
  just before touching (`BUMP_REACH` 1.05) and shove each other visibly when
  the pointer or the spotlight drives one into another. The grid keeps its
  order: the pull home still wins over any distance. It reads each pebble's
  place for the frame, so the catalog's update runs before the flow's; it also runs
  while the grid returns from a project, so the pebbles are already apart as
  they fade in rather than springing apart in view.


Every pebble holds its thumbnail - the rock, or the project's own model
-----------------------------------------------------------------------

Empty slots use `EMPTY_SLOT_THUMB` (the same rock). `loadThumb` keeps one
promise per path and each pebble adds a `clone()`, so ten rocks are one
187 KB download (`EMPTY_SLOT_THUMB` lives in `src/projects/schema.js`). A
binary `.glb` would be about a quarter smaller than the `.gltf`.

A project with `thumbSize` shows its own model instead (Emergent Space:
`thumbModel` is the same `aggregate.glb` its project view samples into
points, at 1.9 - the user had 2.4 made 20% smaller). It's centred and scaled
to that longest side, whatever units it was drawn in, and drawn in the
rock's ink as it appears on screen (`THUMB_INK`, an unlit colour) rather
than the file's own material - the aggregate's is a bright, glossy red.
Without `thumbSize` the thumbnail is placed as the rock always was (0.2
scale, 1 unit down). Either way the spotlight pulses it from
`contentBaseScale`.


"Under construction", and tags as HTML over the canvas
------------------------------------------------------

Clicking an empty slot shows "under construction" (`.cube-tag--empty`) on it for `EMPTY_TAG_DURATION`,
fading over `EMPTY_TAG_FADE` - in ink, not the orange, since an empty slot
isn't an invitation. It was "Still empty..." in a bordered chip; asked for,
it's now two lines with no box, lifted off the pebble by the spotlight
name's paper glow, and a different answer each click - "under
construction", "still settling", "yet to take shape", "a grain not yet
fallen", never the same twice running (`emptyWords` in `src/app/words.js`, set through
`ui.onEmptySlot`: the words are the page's, like the tap hint's). All
the tags over the canvas are now bare text, so that look - no box, the
paper glow, a "\n" kept as a line break - is `.cube-tag` itself; the two
hanging on a string share `.cube-tag--hanging` (the tap hint's used to
borrow `.cube-tag--spotlight`, which made selectors depend on render
order). Tags are HTML over the canvas, not sprites:
real Fira Sans, sharp at any pixel ratio, styled in CSS, and
`pointer-events: none`. `placeTagOnPebble` projects a point on the pebble's
top towards the bottom of the screen.


Selecting: pointerup on the canvas, and drags don't count
---------------------------------------------------------

A pebble is selected by the press's own `pointerup` on the canvas
(`onCanvasSelect`; main mouse button, or any touch or pen), not a `click`
on window - see "Safari". A press that travels over 5px is a drag
(`wasDrag`): it stirs the grid, or orbits in a project, and never selects.


The grid arrives, a pebble at a time
------------------------------------

Reported: the switch to the pebbles was too abrupt - the whole grid was
there the moment the loader faded (0.9s), and on the way back from a
project every pebble faded in together over 0.7s. Now, both times, each
pebble surfaces out of the paper on its own beat: from `ARRIVAL_DEPTH`
below its place, at `ARRIVAL_SMALLEST` of its size and clear, eased up to
itself over `ARRIVAL_DURATION` (3.2s - 1.6 was still too fast), each
setting off at a random moment within `ARRIVAL_STAGGER` (2.4s). Then, asked
for too, what's inside them arrives one by one in a random order
(`CONTENT_ARRIVAL_*`: the first 3.2s in, 0.35s apart, each growing in with
a slight overshoot). Like the rest of a pebble's state it is a pure
function of time (since `startArrival`), laid over whatever its mode has
set by `applyArrival` - so the return no longer tweens opacity (GSAP's
tween and the per-frame state fought, see `closeProject`); 'returning'
paints the resting state each frame and the arrival scales it. The loader
announces its exit with a `fluxloader:leaving` event, and its fade is long
(`EXIT` 2.6s, its wordmark lingering) so the pebbles surface as part of it:
they start the moment it begins to clear (`ARRIVAL_AFTER_LOADER`, 0). Until
then `arrivalStartedAt` is Infinity: hidden under the loader.


Clicking a project knocks the rest of the grid off the screen
-------------------------------------------------------------

An instant boom - one shockwave from the clicked pebble knocks the others
out (`BOOM_PUSH`) and up (`BOOM_LIFT`), settling in ~0.2s (`BOOM_SNAP`),
reaching further ones slightly later (`BOOM_WAVE`) - a hang (`BOOM_HANG`),
then a slow, straight, staggered fall off the bottom of the screen
(`DROP_FALL`, `DROP_STAGGER`). "Down" is world +Z, down the screen from the
overhead camera; `DROP_SINK` keeps fallers behind the chosen one. Nothing
spins, shakes or drifts: each was tried and disliked.

It's the `'dropping'` mode in the pure-function scheme, not tweens.
`openProject` runs `DROP_OPEN_AFTER` into the fall and the camera sets off
at speed (`OPEN_CAMERA_EASE`, `power2.out`) while the others still fall -
waiting for them read as a pause. A model landing mid-move finishes the
move in the time left rather than restarting it. Closing is `'returning'`:
pebbles are placed home each frame while the grid fades back in. Clicks,
hover, Escape and resize only act in `'catalog'` and `'detail'`.


A pebble's colour drifts with its shape
---------------------------------------

Each pebble's warmth follows its own shape waves (`pebbles/gradient.js`):
graphite at a trough, a brown-grey at a crest, on the same flux the shape
rides, so no two pebbles are the same shade at the same moment and none of
them holds still. Chosen from five previewed options - the other four are
under "Tried and removed".

Two things to know before touching it.

**A pebble's tone is in its alpha, not its colour.** `addGraphite` sets
`outgoingLight` to one flat colour and then varies `diffuseColor.a` - how
heavily the pebble is laid down over the paper. That is what makes it read
as pencil rather than as a lit solid. So this changes only which colour is
laid down; the shading rides on top, untouched, and `paintGlow`, the fades
and the arrival all keep working because none of their meanings move.

**It is a multiplier, not a colour to mix towards.** This was a real bug,
caught by reasoning rather than by the first round of measurement.
`paintGlow` dims the face's own colour to a tenth as the spotlight's orange
rises - it has to, or the scene's cyan lights turn that orange green - and a
visited pebble rests darker. `mix(diffuseColor.rgb, WARM, k)` ignores both:
at the peak of a glow it put a brown back over a face that is supposed to
have dropped out, polluting the one orange that means "click me". The fix is
to carry the tint as a ratio against the resting graphite
(`WARM / PEBBLE_COLOR`, about 1.28/1.03/0.84) and multiply, which composes
with anything that dims the face. Measured either side: the spotlight's
orange reads rgb(177, 106, 54) flat and rgb(176, 106, 56) with this on -
unchanged - while the resting pebbles go from a median warmth (R-B) of 0.0
to 8.4, their spread from 11.1 to 17.8, and that median drifts through a
couple of counts over 18 seconds.

Worth noting what this is **not**: it adds no gradient across a single face.
The flux's three waves are broad enough that each pebble is near-uniform at
any instant, so it reads as ten pebbles in slowly-drifting tones rather than
as a gradient across one. That is the look that was chosen; the name
"gradient" oversells it.

The far colour is a brown-grey between the point clouds' dark red and warm
grey, so the catalog and the project view read as one set. **Orange and teal
are deliberately not available**: one orange means "click me" (the spotlight
and the About handle), and "the blue isn't right" - teal glass, a teal hover
tint and a single teal ink have all been tried and taken out. `AMOUNT` (0.85)
and `WARM` are the two knobs; 0.6 read as too subtle, as every quiet first
pass here has.

The rim is left alone: a near-black silhouette a pixel or two wide, where
this would not read, and it already carries the spotlight's colour.

**What it costs to be seen, and the measurement that got this wrong twice.**
A pebble is laid down at an alpha of roughly 0.27, so only about a quarter of
the chosen colour reaches the screen - the rest is paper showing through. The
first attempt used a brown-grey (92, 74, 62): it moved the ink a long way and
the picture by about one count, and the user saw nothing. The sienna here is
about three times stronger on screen. Measured composited, over the whole
catalog:

| | flat | brown-grey (92,74,62) | sienna (138,80,48) |
|---|---:|---:|---:|
| mean pebble colour | rgb(195, 192, 187) | rgb(196, 193, 187) | rgb(199, 193, 186) |
| warmth (R-B), median | 8.0 | 10.0 | 13.4 |
| warmth at pebble cores | 5.1 | - | 12.0 |

The mistake worth not repeating: the first round read the WebGL canvas
directly and unpremultiplied it, which **recovers the ink's colour however
faintly it is laid down**. It reported "warmth 0.0 -> 8.4" for a change the
eye could not see at all. The canvas is transparent; the thing to measure is
a page screenshot, which is the composited result. Two further attempts also
failed and are worth knowing about: a fixed screen patch is useless because
the flux changes the pebble's SHAPE by 30% of its radius, so silhouettes
swell through the patch and swamp any colour reading (48% wobble in pixel
count even with the float, flow and spotlight frozen); and selecting "pebble
cores" by how dark they are cannot measure a lightness change, because the
selection is conditioned on it.

**So the same wave also changes the tone.** Colour has a low ceiling here:
at 0.27 alpha, a colour strong enough to make the drift unmistakable has to
enter the orange family, which "one orange means click me" forbids. The eye
is far more sensitive to lightness than to low-saturation hue, so the wave
also multiplies the pebble's alpha by 1 +/- `TONE` (0.20) - a pebble at a
crest is laid down a fifth more heavily than at a trough. It is applied to
the shaded term only, so the orange wash stays a floor, and it scales
whatever the shading arrived at, so a pebble faded down by the arrival
breathes as it surfaces.

**Damped out as the spotlight rises.** The glowing pebble already pulses in
scale and colour; a second density ripple on top muddies the one signal that
means "click me". The material's own opacity doubles as the tell - 0.14 at
rest, 0.24 once visited, up to 0.6 at the peak of a glow - so the tone drift
fades over `smoothstep(0.25, 0.5, graphiteOpacity)`, reaching zero by the
peak. Edges in increasing order, since a reversed smoothstep is undefined on
Safari.

**What could not be measured, and why.** The tone drift's magnitude is
arithmetic on the shader (alpha times 1 +/- 0.2) and the shader was verified
to compile, render and open a project in both layouts - but no aggregate
measurement here can confirm how it *looks*, and four were tried:

- a whole-image mean cancels, because ten pebbles sit at ten independent
  phases and the modulation is symmetric about 1 by design
- a fixed screen patch is swamped by the flux moving a pebble's silhouette
  30% of its radius (48% wobble in pixel count even with the float, flow and
  spotlight frozen in a throwaway build)
- picking "pebble cores" by how dark they are cannot measure a lightness
  change, because the selection is conditioned on it
- the spread of lightness over the image is unmoved (sd 35.69 flat, 35.73
  with the tone drift), because each pebble's own shading already varies its
  alpha fourfold across its surface - 0.084 facing the eye to 0.336 at the
  silhouette - and a fifth on top of that is lost in it

That last figure is also the useful one for tuning: a pebble already spans
about 43 counts of lightness from its lit face to its silhouette, so `TONE`
at 0.20 moves its densest parts by around 22 counts over a wave. Judge it by
eye on the live site; `TONE` and `AMOUNT` are the two dials.


Three kinds of project, and bringing one forward
------------------------------------------------

Asked for: projects divided into research, teaching and "the real world",
each tagged, and a way in the catalog to highlight one kind "by pulling the
rest of the pebbles significantly downwards or backwards ... to make them
look smaller". Every project declares a `category` (`CATEGORIES` in
`src/projects/schema.js`; required, so a new project can't forget it), shown
as a small tag after its name in the bar - on the title's own line, since a
line of its own would make the bar taller, and on a phone that height is
taken out of the model's framing. Until real projects fill them, the empty
slots stand in for the other two kinds (`EMPTY_SLOT_CATEGORIES`, four each,
mixed through the grid so a kind brought forward isn't simply a row). The
engine is handed `categoryOf(slot)` and only ever compares the strings.

The filter (`CategoryFilter`, top left in the catalog, where the bar sits in
a project) is All / Research / Teaching / The real world; choosing the one
already chosen clears it. The pebbles of the other kinds are pushed back
along the line from the overhead camera until they look `FOCUS_SCALE` (half)
their size, over `FOCUS_TIME` (`pebbles/focus.js`, laid over every mode
after the arrival, like it; the depth comes from the camera's height,
`grid.viewHeight`, so it's the same on every screen). Backwards, not
straight down: straight down, the perspective drew every sunk pebble in
towards the middle, into a clump behind the chosen ones; along the camera's
line each stays where it was, only smaller. They also fade (asked for), to
`FOCUS_INK` (35%) of their ink - face and rim by opacity, the opaque
thumbnail by mixing its own copy of the ink towards the paper
(`fadeFocus`). The opacity is only faded where a mode sets it every frame
(catalog, dropping, returning): it multiplies, and under the open
project's fade-out tween it would compound. No colour change - one orange
means "click me". While a kind is chosen only that kind jumps (asked for):
the spotlight only lands on it, and one already glowing on another kind
when the choice changes settles at once - its dwell shortened so the
fade-out starts at the strength the glow had reached, rather than
snapping off (`spotlight.dwell`, `cut`).

A click on a sunk pebble brings its kind forward rather than opening it: a
project opens on its own pebble, which has to be up in its place for the
dissolve and the framing.



The project view: camera
========================


The detail camera looks along the catalog's screen-up; every move slerps
------------------------------------------------------------------------

Opening and closing used to roll the grid 90°: the detail camera looked
along +X, so the two views disagreed about "sideways", and the roll landed
in one frame at OrbitControls' overhead pole. The detail camera's default
heading (azimuth 0 in `viewDirection`) now sits on +Z looking along -Z, the
catalog's screen-up, so every transition is a pure tilt; the model is
turned a quarter (`DETAIL_MODEL_YAW`) to show the face it was authored for.

Every animated move goes through `moveCamera`, which tweens position and
target and slerps the quaternion to exactly where `lookAt` would leave it,
with `rig.orientationLocked` keeping `controls.update()` out until it
lands. It and `animateFov` cancel any move in flight first. To verify: on a
pure tilt the quaternion's Y and Z stay 0 (Rock Print: ~0.03, its 4°
azimuth). If the catalog's axes ever change, azimuth 0 must follow its
screen-up; keep a project's `view.azimuth` small.


The default view, and a project's own `view`
--------------------------------------------

Without a `view`, the camera looks square-on along Z (one-point
perspective; an oblique view and `DETAIL_PROJECTION = 'orthographic'` were
tried and rejected). `DETAIL_FOV` is 45° side by side, 30° on a phone,
where 45° reads as a tunnel. `controls.autoRotate` stays off; the model
turns instead.

A project's `view` sets its landing shot: `elevation`, `azimuth`, `turn`
(the model's spin when it appears), and optionally `zoom` (closer than the
cube's fit) and `lift` (higher on screen, a share of its height), each one
number or `{ side, stacked }`. A `view` is framed on the cube, not the
model's bounding box (which balloons with scattered points), with
`VIEW_FRAME_MARGIN`; on a phone with the drawer parked, it centres on the
whole screen if the cube's top clears the bar.

Rock Print's `{ elevation: 58, azimuth: 4, turn: 94, zoom: { stacked: 1.75,
side: 1.4 }, lift: { stacked: 0.14, side: 0 }, sway: 13 }` was fitted to the
user's phone screenshot: a throwaway build (never committed) froze the turn
and gather and exposed a hook to set the view; renders at the screenshot's
viewport were scored by overlap (IoU) of their point masks, coarse then
fine, which also showed the leftover error was placement - hence `lift`.
The fitted phone zoom 1.9 was eased to 1.75 on request (it cropped the
pavilion); desktop uses 1.4 and no lift. `turn` is the screenshot's 118°
less the 24° the model turns during the gather, so the shot is on screen as
the gather completes - it shifts if `GATHER_DURATION`, `DETAIL_ROTATE_SPEED`
or `DETAIL_MODEL_YAW` change.

Emergent Space's `view` is there for the framing as much as the angle:
without one the fit is the model's box at the moment it opens, and on a
phone (`DETAIL_MARGIN.stackedParked` crops in) a single aggregate's long
arms ran off the screen as it turned. Framed on its cube, they stay in.


Fitting allows for depth and for what else is on screen
-------------------------------------------------------

`frameDetail` adds the box's depth along the view axis (the near face
projects larger), and fits into what's left once the drawer (width side by
side, height on a phone) and the bar (height, phones only, measured live by
`barFraction()`) have taken their share. `DETAIL_MARGIN` (default view
only) crops in on a phone with the drawer parked - a width-limited fit
would leave the model in a thin band - and backs off past 1 with it open,
where height is the limit.


The open drawer: the whole model beside it, or a close-up below it
------------------------------------------------------------------

`frameWithDrawerOpen` decides, for the drawer, resize, a late model load and
zooming back out. On a wide screen the drawer sits beside the model, so
`frameDetail` fits it into the space left (the project's `view` and side
zoom kept); the hint and zoom work there, kept clear of the drawer. On a
phone the drawer covers the lower half, so it's the close-up
(`framing.frameCloseup`: `CLOSEUP_ELEVATION` 38° on the project's heading,
`CLOSEUP_DISTANCE_FACTOR` of its radius) - an atmospheric crop, not the
whole piece. Rock Print's steeper angle left only fragments of pillars
there, hence the fixed elevation.

A pile (Emergent Space) is framed on its aggregates instead, in both
layouts - a zoom in on the three, asked for by the user: `pile.bounds()`
gives their extent from their points (or, still falling, where a settled
pile lies) as a box round the axis the pile turns about, and `frameDetail`
fits that box (`fit`) into the space beside or above the drawer, closer on
a phone (`PILE_DRAWER_ZOOM`), where the box's allowance for any turn and
for depth left it small in the short strip. The plain close-up showed only
a couple of rods; fitting the whole cube showed a small pile. On a phone
1.6 kept the pile about the size it was with the drawer parked - the user
asked again for a zoom there - so it is 2.2: the pile fills the strip
above the drawer and its outer rods may run off the edges.


The model turns; the camera nods (`view.sway`)
----------------------------------------------

The model turns inside the pebble's place, a full turn every 80s
(`DETAIL_ROTATE_SPEED`; 40s read as too fast), computed from
`detailRotateStartTime` (reset when the model appears, which the gather
shares). The fit is computed once at the start angle; Rock Print stays in
frame across a full turn.

`view.sway` (Rock Print 13°) nods the camera that far above and below, over
`SWAY_PERIOD` (22s, asked for "a bit slower" than 16s; 8° over 20s read as too subtle). `updateSway` applies
it as a change from last frame's angle about the camera's right axis
through the target, so it rides on whatever the camera is doing - landing
view, drawer, zoom, the visitor's orbit. It holds while a move is in flight
or the visitor orbits, and until the gather is done, then restarts from
zero with a `SWAY_EASE_IN`, so it never jumps. Only elevation changes.
Opt-in: it would break a square-on default view. It never tips the camera
within `SWAY_POLE` (0.12 rad) of looking straight down or up: orbited to
the top, a nod carried it over the pole, the controls flipped it round
each time, and the screen shook (reported after a double-click there) -
a step that would cross is skipped until the nod turns back.


Double-click / double-tap zoom, and the touch-point hint
--------------------------------------------------------

A double-click does what the project's `doubleClick` says (`detail.doubleClick`):
`'zoom'`, the default, is `detail.toggleZoom`, which moves the camera to `DETAIL_ZOOM` (40%) of its distance
towards the cloud's nearest point under the pointer, keeping the direction
of view; again returns to the frame. A mouse uses `dblclick`; touch
double-taps are timed by hand on `pointerup` by the events' own
`timeStamp` (`DOUBLE_TAP_TIME`, `DOUBLE_TAP_DISTANCE`) - phones don't
reliably send `dblclick`, and where they do it's ignored for touch, or it
would zoom in and straight back out.

The tap hint (`components/TapHint.jsx`) is a white disc with a black outline and rings that presses
twice (2.2s CSS animation, `tap-hint-press`), readable over the cloud, the fog and the paper,
and not competing with the orange. Its size (`--hint-size`) follows the
screen's shorter side, 3vmin between 1.1rem (a phone, as before) and 2.6rem;
it sits at `z-index` 2, over the canvas. `maybeShowTapHint` shows it once
the gather is done, then every `TAP_HINT_GAP` (8s - long enough for one
to hang and fall away), on a random on-screen
point of the cloud clear of the bar and any side drawer - zoomed in too,
where it invites zooming back out. It skips while the camera moves or a
phone's drawer is open, and not at all for a project with `doubleClick:
'none'` (nor for a held model, with nothing to pause).

Hanging from the dot's bottom, asked for "similar to the string and text"
of the catalog: the spotlight's string and lettering. Its words, on two
lines (asked for): "double-tap to" ("double-click to" with a mouse, by
`(hover: none)`) over what it does - "zoom", "pause" for `'hold'`, "drop
again" for `'drop'` (`hintWords` in `src/app/words.js`; the engine passes
the project's `doubleClick`, the page picks the words; every tag keeps a
"\n", `white-space: pre`).
First just "double-click", then the action alone. Both in the dot's black
(`--hint-line`) - first orange with "Double-click to zoom in" (or "zoom
out" while zoomed), until the user asked for the one word, in black. It
is the same rope as the spotlight's (`createRope` and
`drawRope` in `engine/tags.js`, the spotlight's unchanged) with the
`HINT_*` settings: elastic and slack where the spotlight's is stiff, so it
starts bunched up at the knot (`HINT_OPEN`), falls open, overshoots to
about 1.5 times its length and bounces, and each of the dot's two presses
tugs it again (`HINT_TAPS` of `HINT_PRESS`, matching `tap-hint-press` -
change them together).

**Then it falls like a leaf** (asked for: stay a bit longer, then "fall
downwards like leaves until they disappear from the screen"). It used to
fade out at 2.2s; now the dot fades in (`tap-hint-in`, `HINT_FADE_IN`),
pulses - its two presses and rings played `HINT_CYCLES` (2) times, asked
for "pulse longer", so `HINT_HOLD` is 4.4s; each press tugs the string -
and lets go: `hintFall` eases it up to a gentle
speed (`HINT_FALL_SPEED`, a share of the screen's height a second, so it
takes about as long on any screen), drifting side to side
(`HINT_SWAY`, `HINT_SWAY_PERIOD`) and tilting the way it drifts
(`HINT_TILT`). The engine moves the dot itself (`overlays.hintDot`, a
transform on `.tap-hint`, which the dot's own press animation doesn't
use), the string's knot follows the dot's tilted bottom, and the rope
trails behind under its own gravity, until it's off the bottom of the
screen. **Double-tapped, it dissolves** into specks where it is, like the
aggregates do (asked for - first tried while falling, but the user wanted
it only on a double-tap; the aggregates' `uFade` drops a fixed grain under
a rising threshold): `detail.doubleClick` calls `ui.dissolveTapHint`, and
any `hideTapHint` meanwhile leaves it to finish (closing the project
`force`s it). An SVG filter in
`HintTag.jsx` (`#hint-dissolve` - fractal noise, its value moved into
alpha, a steep linear transfer, composited "in" the element) is put on
the dot and the words while it dissolves (the string only fades: its SVG
spans the whole screen, and the filter over all of it, redrawn every
frame, froze the page for seconds), and the engine
raises the threshold through the transfer's `intercept`
(`HINT_DISSOLVE`, 1.2s, `HINT_SPECKLE`). Off once it's gone. With reduced
motion it just goes at the end of the pulsing. Rock Print's first timed zoom
(`AUTO_ZOOM_FIRST`, 5.6s after the gather) starts as the first hint lets
go. Unchecked in Safari, whose support for SVG filters on HTML has been
patchier than Chrome's - if it shows nothing there, the hint still goes at
the end of the dissolve. Not watched frame by frame here either: software
WebGL renders Rock Print at a frame every second or two. Hints now
stay above the lower quarter of the screen (y > -0.5), leaving room for
the words below. The tags' engine module gets the hint through
`index.js`, which wraps the `ui` handed to `detail.js` - the dot stays
React's, the string the engine's.


Timed zooms on Rock Print (`autoZoom`), holding it, from inside
---------------------------------------------------------------

Asked for: "zoom ins and outs on the model every 10 seconds". `autoZoom: 10`
moves the camera in on a random point of the cloud (to `AUTO_ZOOM`, 0.4 of
its distance - the double-click's), then 10s later back out to the frame,
and so on (`maybeAutoZoom` in detail.js). The first comes
`AUTO_ZOOM_FIRST` (3.5s) after the points have gathered, just after the
double-click hint has gone - a whole 10s after the gather felt too long a
wait (asked for). The same move as Emergent Space's close-up (`CLOSE_UP_MOVE`,
1.6s) and the same following (`follow`): aimed where the point will be
when the camera arrives, then translated with it as the model turns, so
it stays put on screen. Postponed a second at a time while the camera is
moving, the visitor orbits, or a phone's drawer covers the model; a
visitor's own double-click restarts the wait, so it isn't undone straight
away. Can't go with a `drop` (its close-ups are the zoom there). The
sway carries on, nodding about the zoomed-in point. If a move runs long
(a slow frame), the point ends a little off centre and is followed from
there - not re-centred, since the centre beside a side drawer is offset.

**A double-click holds it still instead** (asked for: "no zoom in, but
the model stops rotating until the user double clicks again").
`doubleClick: 'hold'` (the project setting that also gives 'zoom', the
default, 'drop' and 'none') toggles `model.userData.held` ({ total, at }), which
`modelTurn` subtracts, so the turn picks up exactly where it stopped. The
camera's nod holds with it (`updateSway`'s `held`), and the timed zoom
waits while held and for a full round after. The hint still says
"double-click".

**From inside, at eye level** (asked for: "zoom ins from inside the
pavilion as if you are at a person's height looking through the
columns"). `eyeLevel: 0.4` makes two of every three timed zooms a walk in to a
spot inside (`findInsideSpot`, `camera/inside.js`): the points within
`SLAB` of that share of the height binned into a grid over the footprint,
the most open cell (furthest from any column, by a breadth-first pass)
that has columns on all four sides, among the best `CHOICES` at random;
the gaze is the longest clear line from it that ends on a far column.
There the camera is held in the model's own frame - turning with it, so
it can't walk into a column as it turns - and the gaze drifts
`INSIDE_PAN` either side over `INSIDE_PAN_PERIOD`; the nod holds off, to
keep it at eye height. 0.4 of the height including the ground: the
pavilion is 1.88 units tall in the scene, so about a person's eyes if its
columns are ~4m. Three things had to change for it, measured in a
throwaway build: the camera's near plane (1 unit) clipped ~6,000 points
of the nearest columns, so it drops to `INSIDE_NEAR` (0.05) while inside
and back once out (`rig.baseNear`); and the
lens widens to `INSIDE_FOV` (65°), more on a tall phone so it's at least
`INSIDE_WIDTH` (55°) across, up to 90° - at 30° a phone saw one column.
The first try looked a random way and straight into a column.

**And facing back** (asked for: "another zoomed in view from inside the
pavilion facing the other direction"). The timed zooms now go in threes:
a point, inside, then inside again from the same spot turned round -
`findInsideSpot` given the last spot keeps it and looks along the
clearest line at least `FACING_BACK` (about 135°) from the last gaze,
rather than straight back, which could face a column.


The project view: point cloud
=============================


Quantized, not Draco-compressed
-------------------------------

The original `.glb` declared Draco but nothing used it: 2.2 MB of raw
float32, plus a 336 KB decoder downloaded for nothing. Draco doesn't apply
to non-indexed POINTS at all. `KHR_mesh_quantization` does: int16 positions
and uint8 colours, 28 -> 10 bytes a point, 2.2 MB -> 922 KB, about a
millimetre of precision. COLOR_0 (the scan's colours) is still in the file
but unread - dropping it would save ~315 KB. `static/draco/` keeps the
decoder for any model that genuinely uses Draco.


A mesh becomes points as it loads
---------------------------------

Emergent Space's `aggregate.glb` came as a plain triangle mesh from Blender
(36 KB, ~1,250 vertices, ~115 units across), not a point cloud. Rather than
convert it offline, `loadPointCloud` turns any `.glb` with
no POINTS in it into a cloud (`pointsFromMeshes`): `MESH_SAMPLE_POINTS`
(20,000; a project's `points` overrides it - Emergent Space uses 8,000, as
60,000 and then 20,000 read as solid rods on the aggregate's thin arms)
points scattered over the surface with three.js's `MeshSurfaceSampler`,
shared between meshes by area, in world space (so the file's own rotation
holds), then centred and scaled so the longest side is `MESH_FIT_SIZE`
(`CUBE_SIZE`), since a mesh arrives in whatever units it was drawn in. From
there it is an ordinary cloud: inks, sizes, gather. It downloads a fraction
of what a sampled cloud would weigh (Rock Print's 78k quantized points are
922 KB) and a mesh exported from Rhino or Blender works as it is. A real
point cloud is left exactly as it is. Emergent Space's aggregates are now
drawn as the mesh itself (`drop.solid`, below); its sampled points are no
longer seen.


kh-reuse: a solid laptop that stands still
------------------------------------------

The user asked for the laptop as a 3D model, not a point cloud, with no
rotation, open and with its screen facing the visitor - something will be
shown on the screen later. Two project settings rather than a branch:
`solid` draws a mesh detailModel as itself in the inks (`makeInkMaterial`,
as Emergent Space's aggregates), dissolving in through its grain over the
reveal instead of points gathering; `still` holds the model's turn at 0,
and `orbit: false` keeps the visitor from orbiting or wheel-zooming it by
hand (asked for later; a double-click still zooms).
`view.turn: -90` undoes the detail view's quarter turn so the screen (+Z in
the model) faces the camera. At the user's request it is light grey and
its edges rounded: `solid: { lit, shade }` gives a solid model its own
colour pair (screen RGB) in place of the inks' orange and red - the
pebble's thumbnail stays graphite like every other. The mesh is welded,
so the rounds shade smoothly (and the file is 176 KB gzipped). The pebble's dissolve
doesn't fade away here: its points settle onto the laptop's screen in the
clouds' inks and float about there, slowly, while the project is open
(`screen`, the name of the model's screen mesh, in its own space X across,
Y up, Z out; uScreen in pebbles/dissolve.js). The user's recorded film plays
under them (`screenVideo`, `pointcloud/screenVideo.js`): a muted, looping
<video> on a quad just in front of the screen's face, as a VideoTexture,
cropped to fill rather than squeezed; it fades in once its first frames
play, so until then the points float on a bare screen. 1.7 MB, 720p H.264,
copied as it came (metadata stripped, `faststart` so it streams at once).
Headless Chromium here can't decode H.264, so it was checked with a WebM
copy in a throwaway `dist/`. Once the film plays the points fade down to
a quarter (`SCREEN_FILM_DIM`), and the camera comes in close on the screen
(`view.zoom`, `view.lift`).

On a phone (the stacked layout, under 860px) it shows a phone instead,
playing the user's mobile recording (`phone: { detailModel, screenVideo }`):
a narrow screen shows a tall film better than a laptop's wide one. Which
model is chosen as the project opens (`layoutMode()`), each kept once
loaded (`pebble.userData.details`); the same `view` serves both, its
`stacked` values fitted to the phone. `phone.glb` is made in code like the
laptop, its screen shaped like the mobile film (390 x 664) so none of it is
cropped. Until the model has
loaded the points hold, swollen, at SCREEN_HOLD rather than fall towards a
screen not yet known. Only one point in three
stays (`SCREEN_EVERY`, the rest fade as in any dissolve), and those keep
their tails for good: a tail re-runs the float `SCREEN_TRAIL` (2.5s)
earlier, since at its slow pace the dissolve's own 0.12s showed nothing.
Its pebble holds a reuse sign rather than the laptop (`reuse.glb`, three
arrows round a circle, made in code, lying face up for the playground's
camera from above). No tap hint: it picks a point of a cloud, and
there is none. The model is placeholder geometry built in code; the screen
is a separate thin panel on the lid, where content would go.


Emergent Space: aggregates dropped with live physics
----------------------------------------------------

The user asked for three aggregates falling onto a surface and interlocking,
and chose live physics - a fresh drop every time the project opens - over a
drop simulated once and played back, or one exported from their own
Blender/Rhino simulation. A project's `drop: { count, size, ground }` does it
(`src/engine/pile.js`):

- **The engine is cannon-es**, plain JavaScript, 36 KB gzipped. It's a
  separate chunk loaded by `import()` only when a pile is built, and
  `startDrop` starts that download as the pebble is clicked; the catalog
  and Rock Print never load it.
- **Collision shapes come from the mesh.** `findRods` finds the straight
  rods a crossed-rod aggregate is made of (the furthest vertex gives a
  direction, the vertices near that line refine it and give length and
  radius) and each becomes a cylinder, `PILE_COLLISION_FATTEN` thicker than
  drawn so the thin rods never pass through each other. The aggregate's
  three rods are ~27 times longer than thick. A mesh that isn't made of
  rods would need another shape.
- **Drawn solid** (`drop.solid`, at the user's request - "not as point
  clouds"): the mesh itself, merged into the fitted space (`userData.solid`
  from `pointsFromMeshes`), each copy a THREE.Mesh in `makeInkMaterial` -
  orange where it faces a fixed light, deepening to the dark red, the
  points' inks laid on as shade rather than the scene's cyan lights. Without
  `solid` each copy is the shared sampled cloud. Either way `pile.sync()`
  moves each to its body every frame, and the ground stays points.
- **The ground is the clicked pebble.** At the user's request the points the
  pebble dissolves into swell out, then fall - each in turn, gathering speed
  - to a place on a disc on the ground (`aGround`, `uGround` in the dissolve
  shader; `PILE_SURFACE_RADIUS`), turn the grey ink, shrink and lighten, and
  stay as the surface the aggregates land on: no crossfade and no end for a
  project with a `drop` (`points.userData.ground` in `updateDissolve`). It's
  laid by about 2.5s after the click, before the first aggregate lands, and
  turns with the pile once it has settled (the dissolve is the pebble's
  child, the pile the model's, so it's turned by hand; `startDrop` squares
  it to the pebble again). A separate faint disc of grey points came first;
  at full size the falling points read heavy and dark, hence the shrink.
- **Tuned to interlock.** Dropped a few hundred times off screen (the same
  cannon-es setup in Node, counting drops where all three end up
  touching): a lively drop - more spin, bounce and spread - left them
  apart about half the time. Low bounce, high friction, damped tumbling,
  a small start spread and a gentle pull to the middle (`PILE_PULL`, as if
  the surface were a shallow dish; it also keeps the pile centred in the
  frame) got 58 in 60. It settles in about 4.5s.
- **Watchable**: at first the drop was over before anything could be seen -
  it started the moment the model loaded, under the camera's move in and
  the points' fade-in. Now they're held, hidden, for `PILE_WAIT` (1.2s),
  start above the frame (`PILE_FIRST_HEIGHT` 2 sizes up; still 58 in 60
  interlocking) so each falls into view, and the whole thing plays at
  `PILE_TIME_SCALE` (0.4; 0.6 until asked to fall slower) - slow motion,
  which changes nothing about how they land.
- **Settle, then turn**: the model's slow turn waits for `pile.settledAt`
  - the moment the pile *looks* still: every body under `PILE_REST_SPEED`
  (0.12 sizes/s) and `PILE_REST_SPIN` (0.35 rad/s) for `PILE_REST_TIME`
  (0.2 simulated s), or `PILE_SETTLE_AFTER`. It used to wait for cannon to
  put every body to sleep, and the turn visibly lagged the landing (asked
  to fix): cannon's test lumps linear and angular speed together against
  one size-scaled limit, then waits 0.6s more, and a long thin rod's last
  rock decays slowly - measured over two drops, they stopped moving by sim
  ~3.0s and fell asleep at ~3.95s, a 2.4-2.7s wait on screen. Now the turn
  starts 0.45-0.5s after they look still (the 0.2s is deliberate, so a
  pause mid-tumble can't start it). The physics keeps stepping until cannon
  does sleep (`pile.asleep`), so nothing freezes mid-wobble; the model just
  turns sooner. The bodies' own physics is unchanged, so the interlock rate
  is too. Reopening calls `restart()` for a new drop.
- **Drop again on a double-click** (asked for: the tap hint's dot and
  string reading "drop again", instead of a button in the bar).
  `doubleClick: 'drop'` (needs a `drop`) makes a double-click or
  double-tap call `detail.replayDrop`; the hint shows once the
  aggregates are in view (not while they wait hidden), on one of them. It calls `restart(PILE_REPLAY_WAIT)` - 0.3s rather than
  `PILE_WAIT`'s 1.2s, since there's no camera move to wait for - and keeps
  the angle the model had reached (`turnOffset`, read through `modelTurn`
  in camera/framing.js) instead of snapping back to where it opened: the
  new drop falls at that angle and the turn carries on from it once it
  settles. The ground and the camera stay as they are.
- **And on its own**: `drop.repeat` drops it again that many seconds after
  each drop comes to rest (`maybeRepeatDrop` in detail.js, through the same
  replay) - timed from the rest, since a drop takes 5-8s to land on screen.
  Emergent Space used 5s, then 10s, and now uses `closeUp` instead (next).
- **A close-up on an interlock between drops** (asked for, replacing the
  10s repeat): `drop.closeUp: { hold: 5, after: 5 }`. `CLOSE_UP_AFTER` (1s,
  the dots faded in) after the pile is asleep (`restedAt`), the camera moves in
  (`CLOSE_UP_ZOOM` 0.3 of its distance, over `CLOSE_UP_MOVE` 1.6s - slower
  than a double-click's zoom, to read as the piece presenting itself) on a
  random marked crossing that will be on screen, holds `hold` seconds,
  reframes out, and drops again `after` seconds later (`runCloseUp` in
  detail.js). The pile keeps turning throughout - the turn wasn't to stop -
  so the move aims where the crossing will be when the camera arrives
  (`contactAhead`), and from then on the camera is translated with the
  crossing each frame, keeping it centred while the pile turns round it.
  That following stops if the visitor zooms out or orbits; a double-click's
  drop, a drawer reframe or closing the project all end the close-up. No marked
  crossing: it just waits and drops. The tap hint stays away while the
  camera is in. Requires `contacts`; can't be combined with `repeat`
  (`defineProject` throws).
- **The turn slows to a stop before each new drop** (asked for - the
  floor stopping dead looked abrupt). The model and its floor share one
  turn (`modelTurn`), which froze the instant the pile restarted. Now
  `pile.turnStop` ({ at, over }) lets its speed fall evenly to nothing:
  the close-up starts it `TURN_STOP` (3s) before its drop, so it is still
  by the time the old pile dissolves; a double-click's drop (or `repeat`) starts it
  at once, over the dissolve and wait (1.5s). The new drop takes the
  stopped angle as before. The turn still starts at full speed when the
  next pile settles.
- **No double-click zoom here** (asked for): the close-ups are the zoom,
  and their camera move doesn't go through `toggleZoom`. First
  `doubleClick: 'none'`, now `'drop'` (above).
- **The fallen pile dissolves away** before each new drop rather than
  vanishing (asked for - "less abruptly"): `pile.replay()` runs a
  `PILE_FADE_OUT` (1.2s, eased) before `restart()`, keeping the turn going
  meanwhile and taking the angle at the moment of the new drop. It's a
  dissolve into a fine grain (`uFade` in `makeInkMaterial`: a fixed hash
  over the mesh's own space, more of it discarded as it rises), not an
  alpha fade: the aggregates are opaque, and three interlocked transparent
  solids would need sorting and show it. A sin-free hash, since sin() of
  large arguments loses precision on some mobile GPUs. A pile of points
  (no `solid`) still restarts at once.
- **Pulsing dots where they interlock** (`drop.contacts`, asked for): read
  straight from cannon's own contacts between two aggregates (the ground's
  left out), merged within `CONTACT_MERGE` of a size since two rods crossing
  give a cluster, faded with the dissolve. Gathered over the settle rather
  than replaced each step: cannon stops reporting a contact once both
  bodies touching are asleep, and they sleep one by one. Shown only once
  every aggregate is asleep (`pile.restedAt`), not when the pile first
  looks still: in that last second a crossing could slide or part, and a
  dot read as a fixed point was left hanging in the air ("false or in the
  air", the user). So each crossing is kept in both bodies' own frames,
  following them, and on sleep any whose two sides have drifted more than
  `CONTACT_PARTED` (0.04 of a size) apart is dropped. The close-up waits
  for them (`CLOSE_UP_AFTER` from `restedAt`). Blue, asked for (graphite at
  first, then cyan; not orange, which means "click me"); the velocity
  arrows stay graphite. Each dot a solid centre with a ring spreading on
  its own beat; drawn over the rods so a crossing at the back isn't lost.
- **Live velocity** (`drop.velocity`, asked for), the way the project's own
  simulation plots clump velocity: an arrow from each aggregate's centre
  along its motion, as long as it is fast, and its speed beside it in m/s -
  physical speed with the aggregate taken as `PILE_REAL_SIZE` across, not
  the 0.4x playback, so the readings run faster than the motion looks. Both fade out as it slows (`VELOCITY_GONE` to
  `VELOCITY_FULL`), so the fall shows velocity and the settled pile shows
  the interlocking dots. The numbers are HTML placed from the render loop
  through refs (`detail.updateVelocityTags`), never React state.
- **A trap this hit**: the point-cloud loader walks the whole model after
  the pile is built and gives every `Points` the cloud's shader - including
  the dots, whose own uniforms then vanished and threw every frame (which
  also stopped the turn). A `Points` that brings its own look sets
  `userData.ownMaterial`.
- **Frame time**: the physics steps with the frame time (capped like the
  flow), so a slow device plays it slower rather than jumping.
- **Framed** with `view: { elevation: 30, zoom: ... }` on the cube, like
  Rock Print: the drop starts above the frame and lands in it. A phone gets
  hardly any zoom (1.05): the pile lands up to a third of its size off
  centre, and at 1.3 that cut it at the edge.

Point size, three sizes, three inks
-----------------------------------

`uPointScale` carries pixels-per-world-unit from JS (`uSizeAttenuation` for
the projection), so points keep their size across pixel ratios. Each point
is one of `POINT_SIZES` (0.6, 1, 1.6) and one of `POINT_INKS` (dark red,
orange, warm grey), picked once at load (`aScale`, `aTone`) so the speckle
turns with the model; no point lays down more than `POINT_OPACITY` (0.6).
The shader takes exactly three inks (`uInks[3]`).


Points gather out of a scattered cloud
--------------------------------------

With `gather: true`, every open starts the cloud as a flattened ball around
the model that condenses over `GATHER_DURATION` (5.4s; 3.6s felt rushed),
each point
spiralling home at its own moment - all in the vertex shader, one uniform a
frame. `addGatherAttributes` gives each point a start (`aScatter`, in the
cloud's own quantized space, where three.js's bounding box also lives) and
a delay (`aGatherDelay`). `setGather` only touches clouds loaded to gather,
or the shader would read a missing start as the origin. The gather's maths
lives in `shaders/pointCloud/gather.glsl`, put in front of the points' and
the tails' vertex shaders in `pointcloud/load.js`, so both place a point
the same way.

**On its own clock, so it never jumps** (asked for: the settling "is
lagging"). The gather was driven by the wall clock, and its first frames
stall - both shaders compiled and the 78,637 points (with their tails'
copies) uploaded on the first frame they're drawn - so the next frame
found every point far along and they jumped; any later hitch did the same.
Now it advances by the frame's time, at most `GATHER_MAX_STEP` (0.1s)
(`model.userData.gatherTime`, reset each time the model is shown): a stall
holds it, while a phone running at 10 fps or more keeps the full pace. And
a newly loaded model's shaders - the points' and the hidden tails' - are
compiled as it loads, before the gather starts (`prepareShaders` in
detail.js), not on its first frame. Software WebGL here runs at a frame or
two a second, so the effect on a real phone is unmeasured. The tails were
the next cost, and are now cut too (asked to try): one quad per point,
each working the gather out twice, drew more than the points themselves -
only every fifth point has one now (every third still lagged a bit;
`GATHER_TRAIL_EVERY`, `addTrails`'s
`every`; a pebble's dissolve keeps all of its own).


Tails behind moving points
--------------------------

Asked for: tails on every point moving on screen, gone once the points
have formed Rock Print or the ground. Two motions qualify - the gather and
the clicked pebble's dissolve (flying apart, or falling into Emergent
Space's ground) - and both are pure functions of one progress uniform, so a
tail needs no history: its shader asks the same function where the point
was a moment earlier (`GATHER_TRAIL`, `DISSOLVE_TRAIL`, in seconds) and
draws a quad from there to the point, as wide as the point at its head and
tapering to nothing, fading down its length (`shaders/trail/`,
`addTrails`). Chosen over a trail of ghost points (beads, and many times
the points to draw) and over line segments (WebGL lines are one device
pixel wide, too faint at a phone's pixel ratio).

- **One instanced quad per point**, its corner in `position` and the
  cloud's own attributes as instance attributes (its place as `aHome`,
  read out of the quantized cloud as floats). The material spreads in the
  points' own uniform objects, so the gather, reveal, point scale and flux
  drive the tails with no extra code; only `uResolution`
  (`trailResolution`, set each frame), the lag and `TRAIL_OPACITY` are
  theirs.
- **Disappearing**: a point easing into place slows, so its tail shrinks to
  nothing by itself (under ~2 pixels it's hidden); `setGather` and
  `updateDissolve` switch the tails off once the motion is over, so they
  cost nothing after.
- The tails' geometry carries the cloud's bounding box, not the quad's:
  `framing.frameCloseup` measures the model with `Box3.setFromObject`.


Safari: defined GLSL, visible failures
--------------------------------------

Reported: tapping Rock Print's pebble on Safari did nothing, with no error.
Likely cause: selection listened for `click` on window, which iPhone/iPad
Safari doesn't send for a tap on a plain canvas - now it's `pointerup` on
the canvas. This couldn't be reproduced here (no WebKit in cloud sessions;
its download is blocked). Three other fixes made blind stay, as they're
correct anyway:

- **No undefined GLSL.** A reversed `smoothstep(1.0, 0.01, x)` and a
  `pow()` at 0 are undefined and Safari's Metal backend needn't do what
  Chrome does (a NaN hides every point); both rewritten to identical,
  defined forms. Keep shader code inside what GLSL ES defines.
- **Stacking by z-index, never page order.** The fog is under the canvas
  (0 and 1); the catalog's tags and string and the tap hint are over it (2).
  At equal z-index Safari drew the canvas over later layers - the hint
  showed behind the point cloud, the names behind the glass.
- **Failures say so.** A failed model load or shader compile
  (`renderer.debug.onShaderError`) puts a message in the project bar, with
  the real error in the console.


Page, colour and drawer
=======================


The whole site is paper
-----------------------

Dark ink (`--ink`) on a warm light ground (`--bg` #f0ede6), a deep teal
accent, the orange invitation; the pebbles are shaded in graphite.
The background is the page, not the scene: the renderer is transparent (an
old `Sky` dome that painted it dark is gone). Nothing is additive - on
paper, adding light draws nothing - so pebbles and points blend normally.
Scene colours go through `screenColor()`. The loader's `palette.bg` must
stay equal to `--bg`.


Scene fog is off; the grey fog is a page layer
----------------------------------------------

`scene.fog` was `Fog(..., 15, 8)` - near beyond far, which fogged anything
close to the camera; re-adding it needs near < far and a range for both
views. The grey fog behind an open project is `.fog` (`components/Fog.jsx`), a CSS layer between
the paper and the canvas (in over 3.2s, out over 1.2s): lighter in the
middle, with two soft banks drifting. Scene fog would grey the model
itself; a page layer touches nothing in the renderer.


Faded faces don't write depth
-----------------------------

While a project is open the catalog's faces fade to 0 with
`depthWrite = false`, restored on close with the reveal; otherwise an
invisible face still hides what's behind it.


No description, no drawer
-------------------------

`hasDescription` (any of `year`, `role`, `context`, `body`, `credits`,
`images`) gates the drawer's handle, so an unwritten project never offers
an empty panel. Placeholder copy isn't published as if real, and a role is
stated only when it can be stated accurately. Rock Print's text is still a
labelled placeholder.


The bar's title moves into the drawer on a phone
------------------------------------------------

On a small phone the bar's title and the open drawer squeezed the model to
a stamp. Below 860px the open drawer's header carries the title and the
bar's hides (`body.drawer-open`); it crossfades rather than toggling
`display`, or both showed at once on closing. The title is one line at
every width (`nowrap`, ellipsis if ever too long).


Drawer pictures
---------------

`images` entries (`{ src, alt, caption, ratio, wide }`) render as figures
under the text (`components/ProjectImage.jsx`, in the frame it shares with
the films, `DrawerFigure.jsx`): the first full width, the rest two to a row
unless `wide`, lazy-loaded, framed at their `ratio` so nothing jumps; no
`src` is an empty dashed frame. The panel is 98% opaque so the cloud
doesn't muddy them. Rock Print's five are photos sized for the drawer -
lead 1500px, others 900px, ~1 MB in all, metadata stripped (CLAUDE.md has
the recipe). Emergent Space's five are mostly diagrams with small text,
unreadable at half the drawer, so all are `wide`: the landscape diagrams
1500px across, the two portrait photos 1000px (enough for the drawer at
twice the pixel density), ~950 KB in all. Captions/credits are empty for
both.

On a phone (under 860px) every picture runs the full width, one after the
other (asked for - two to a row, Rock Print's were too small to see);
the two-to-a-row layout is for the side drawer on a wide screen.

**A click enlarges one** (asked for). Each picture is a button
(`.drawer__enlarge`, a zoom-in cursor) that opens it in
`components/ImageViewer.jsx`: the whole picture (`contain`, not the
frame's crop) as large as the screen allows, on 96% paper, with its
caption. A click anywhere or Escape puts it back, leaving the drawer open
- Escape is caught on the way down and stopped, so App's own Escape
doesn't shut the drawer too; it also goes when the drawer shuts or the
project changes. It is portalled to the body because the drawer moves by
`transform`, which would pin a fixed overlay to the drawer rather than
the screen, and sits at z-index 4, above the drawer (3). No paging
between pictures or pinch zoom of its own - a phone's pinch still works
on the page; add them if asked.


**A film above them** (asked for: Emergent Space's video on Vimeo).
`videos` embeds Vimeo's own player by the film's number
(`components/ProjectVideo.jsx`), full width above the pictures, in its own
grid so the first picture still spans the drawer. Vimeo rather than a file
in `static/`: it's a long film with sound, and Vimeo streams it at the
screen's quality while the site ships nothing. `dnt=1` asks the player not
to track visitors, and `loading="lazy"` leaves it unloaded until the drawer
is scrolled to it. The link it came from carried a `?turnstile=` token -
the sender's Vimeo session - which is dropped: only the number is kept.
Its shape is assumed 16:9 (Vimeo couldn't be reached from here to check);
`ratio` corrects it if the player shows bars. On a phone it wouldn't go
full screen (reported): iPhone Safari can't put an embedded frame full
screen, only its own video player, so `playsinline=0` has the film open
in that as it starts, the old `webkitallowfullscreen`/`mozallowfullscreen`
cover older browsers, and a "Watch on Vimeo" link under it opens the film
on Vimeo - the way that always works.

Asset paths resolve against the Vite base URL
---------------------------------------------

Paths have no leading slash and go through `assetUrl`: Vite's `base`
rewrites the HTML and imports but not strings handed to loaders at runtime,
so absolute paths 404 under GitHub Pages' sub-path. Works at a domain root
too.


Loading
=======


The landing page, then the loader, on one field of particles
------------------------------------------------------------

Asked for: a landing page explaining the concept in a short paragraph, the
floating particles behind it, the first thing on opening, with a link to
"my playground" - and the loader next, on the way to the projects. So the
landing page is the inline loader's first state (`.loader.is-welcome`):
the same particle field drifting calmly, the wordmark, one line ("Where
ideas take shape in motion.") and three short paragraphs, then "Welcome
to the F&F playground" in the one orange (it's the invitation; first "My
playground", then "Welcome to my playground", then "...the Flux and Flow
playground").

**The landing page is the wait** (asked for: no minimum time - load while
the text is read). The catalog loads underneath from the moment the page
opens; the button is `disabled` and grey until `fluxLoader.finish()`, then
turns orange, and following it goes straight into the exit - the page fades
onto the playground as it surfaces (`scheduleExit`: once loaded and
followed). There is no loading screen in between any more: a link to a
project (`#rock-print`), which skips the welcome, is the only way to see
the progress line, while it loads.

The words were first one paragraph from the user's notes on self-organised
criticality; then, asked for something more business-like, a plain list of
the user's services; then, worked through with the user line by line, three
short paragraphs that keep the mystery but say what's on offer: the hidden
currents in a practice and the one small change; the user's background,
architecture and code; and the services as what's done with the currents
(strategy, software and automation, teaching, websites - and art from code
and yoga where they slow down). No closing paragraph: the button invites.
A longer version ran taller than a small phone (375x667), so the loader
scrolls: `place-items: start center` with the mark's `margin-block: auto`
centres it when it fits and starts it at the top when it doesn't (plain
centring would cut its head off, out of reach), the particle field is
`position: fixed` so it stays put.

Inline rather than a React page for the reason the loader is: it's on
screen before the bundle arrives, and the particles are already there for
the loader to carry on with. The project bar's back link was renamed from
"All projects" to "My playground" to match, and later to "F&F playground"
along with the button. The 30s cap counts from opening: by then the
button opens whatever the catalog is doing. The page's `<meta name="description">` is still the old
one-liner - the user's to write.


The start-up loader is inline and waits for real progress
---------------------------------------------------------

`#loader` is markup, CSS and a classic script in index.html, so it's on
screen before the ~260 KB (gzipped) bundle arrives. Particles stream along
braided currents around the wordmark, in paper, gathering strength with
progress. Progress is
real: each start-up asset registers with `engine/boot.js` (`createBoot`),
which calls `window.fluxLoader.finish()` when all are done (failures count as done; a
30s cap). That opens the landing page's way in (above); the progress line
shows only on the way to a linked project, following real progress. All
its animation runs on elapsed time, not frames.

**The streams carry on among the pebbles.** Asked for: the loader's
particles floating on around the pebbles - and then, not crossing them
even seen from above, drawn on the plane through their middles. A first
version kept the loader's 2D canvas running behind the WebGL canvas, the
streams parting round the pebbles' circles on screen; they still read as
passing through. Now, as the loader fades (`EXIT`, 2.6s, its own streams
calming to `AMBIENT_*`), the same current carries on in the scene
(`src/engine/streams.js`, `createStreams`): `STREAM_COUNT` streams on the y = 0
plane, each a fading line through its last `STREAM_HISTORY` points,
shaded between the loader's two colours by the way it flows. They part
round each pebble's circle in the scene (`PART_REACH`, `PART_TURN`: the
part of the drift heading into one is turned aside, one inside is eased
out), and they draw after the pebbles (`renderOrder` 3), depth-tested, so
a pebble's top hides whatever passes under it. A pebble only writes depth
once it has mostly arrived (`applyArrival`), or the arriving, still
invisible ones would cut holes in the streams. They fill the plane the
overhead camera sees, start with the arrival and fade out while a project
is open. WebGL lines are one device pixel: thinner on a phone than the
canvas's were.

**They drift towards the pointer.** Asked for: while the mouse moves over
the grid, or while a finger is down, the streams float slowly towards it,
and go back to their own current once the mouse stops
(`STREAM_POINTER_IDLE`, 0.35s) or the finger lifts. The pull eases in and
out (`PULL_IN`, `PULL_OUT`), takes over most but not all of a stream's way
(`PULL_SHARE`), at `PULL_SPEED` - slower than the current - and slows
within `PULL_SLOW` of the pointer so they gather rather than swarm. The
parting round the pebbles still applies on the way. `streams-view.js`
tracks the pointer on the streams' plane (`trackPointer`, `setTouching`),
apart from the flow's own tracking, since a tap with no move must count
too.


Why clouds load on click
------------------------

A load test, `?cloudtest`, filled every slot with a copy of the first
project, each with its own `?copy=n` URLs so they downloaded as ten
projects would. Its first version loaded all ten clouds at start-up,
measured here (phone viewport, cache off, gzipped):

| Connection        | Normal: models done | Normal: total | Ten clouds at start-up | total   |
|-------------------|--------------------:|--------------:|-----------------------:|--------:|
| Wi-Fi, 30 Mbps    |               0.8s  |       0.48 MB |                   3.2s | 9.66 MB |
| Fast 4G, 9 Mbps   |               1.0s  |       0.48 MB |                   9.2s | 9.66 MB |
| Slow 4G, 1.6 Mbps |               2.5s  |       0.48 MB |                  49.2s | 9.66 MB |

So clouds load only when a project is opened; ten rock thumbnails cost
~2 MB. The flag is gone: Safari's address bar had remembered a
`?cloudtest` address and auto-completed to it, so the live site there
showed Rock Print on every pebble, opened it from all of them, and had no
Emergent Space or working filter. A test switch reachable from the public
address is a trap; rebuild it as a local-only change if it's needed again.


A link to each project
----------------------

Asked for: a project that can be shared on its own. The page's address
carries the open project as a hash - `#rock-print`, the project's `id` -
set when it opens and cleared when it closes (`src/app/links.js`, from
App's `onProjectOpen`/`onProjectClose`; the engine knows nothing of
URLs, it only gained `openProject(id)`, a click on that pebble by name).
A hash, not a path, because GitHub Pages serves one page: a path would
need a 404 redirect trick, a hash just works.

Opened with a hash, the page skips the landing page (index.html starts the
loader itself) and opens the project `LINK_OPEN_AFTER` (1.5s) after the
loader starts to clear, so the playground surfaces around it first and
"F&F playground" leads somewhere that makes sense. Opening from the
playground pushes a history step, so Back closes it and Forward reopens
it (`popstate`); closing with the page's own way back takes that step
back off (`history.back()`) rather than piling up entries, and a project
opened from a link just clears the hash. An unknown hash is dropped. A
sunk pebble (the filter) is brought forward first.


How the code is laid out
========================


React owns the page; the engine owns the canvas
----------------------------------------------

`src/script.js` was 3,733 lines holding everything: the project data, the
three.js scene, the camera maths, the shaders and a few hundred lines of
`document.createElement` building the bar and the drawer by hand. It is now
`src/engine/` (the canvas), `src/components/` + `src/app/` (the page) and
`src/projects/` (the content).

React was brought in for the **page**, not the scene. The drawer is the
clearest case: rendering a project's meta rows, paragraphs, five pictures
and credits was imperative DOM building, re-done from scratch on every
open, with an `imageFigure()` helper that had to remember to set
`aspect-ratio`, `loading="lazy"` and the `is-empty` class in the right
order. As a component it is the project's fields read straight off, and a
new field is a line of JSX.

The scene stayed imperative three.js, deliberately. A pebble's whole visual
state is recomputed from its mode and the clock every frame (see "A
pebble's state is a pure function"), 60 times a second, across ten pebbles,
a Verlet rope in screen pixels, a point-cloud shader's uniforms and a
physics world. react-three-fiber would mean expressing all of that as a
component tree whose props change every frame - which is the one thing
React's model does not make easier, and it would have meant re-deriving
look-and-feel that took many rounds of feedback to settle. The engine is a
single long-lived object with a `start()`, and that is the right shape for
it.

So the boundary is drawn at **how often a thing changes**:

- React state: which project is open, what the bar says, whether the drawer
  is out. Three values, changing on a click.
- The engine: everything per-frame.

They meet at the `ui` object `createEngine` takes (callbacks out: a project
opened, the status changed, roll the fog in) and the methods it
returns (`start`, `closeProject`, `replayDrop`, `setDrawerOpen`,
`dispose`).

The per-frame HTML - the pebbles' names, the string, "under construction", the
tap hint - is the one place this needs care. Those move every frame, so
they must not go through React state: React renders the elements and hands
their DOM nodes to the engine through refs (`ui.overlays`), and the engine
writes `style.transform` and the SVG path's `d` directly, exactly as before.
A `useState` per frame there would re-render the tree 60 times a second for
nothing.

`main.jsx` deliberately does **not** wrap the app in `StrictMode`: it mounts
every effect twice in development, which would build a second WebGL renderer
and a second render loop on the same canvas.

To revisit: if the scene ever becomes mostly static objects reacting to
state rather than to the clock, react-three-fiber becomes worth it. While
the clock drives everything, it does not.


Every project is one module behind one schema
---------------------------------------------

Projects were entries in a `projects` array near the top of `script.js`,
about 200 lines of object literal for two projects, with the engine reaching
into fields directly (`project?.view?.elevation ?? 0`, `drop.size ?? 3`)
wherever it needed one.

Now each project is its own file - `src/projects/rock-print.js`,
`emergent-space.js` - exporting `defineProject({ ... })`, and
`src/projects/index.js` lists them. `defineProject` is the single place that
says what a project may declare: it fills the defaults, normalises the
pictures, and throws on the mistakes that would otherwise show as something
subtly wrong on screen - no `detailModel`, a slot outside `SLOT_COUNT`, a
`body` that isn't an array, two projects claiming the same slot (which
silently hid one of them before).

The point is that the behaviour is uniform: there is no per-project branch
anywhere in the engine. A project that wants to behave differently says so
in its own file through `view`, `gather`, `drop`, `points`, `thumbSize`,
`doubleClick`, `autoZoom` or `eyeLevel`, and the one code path reads it. Adding a project is: write the module, add
it to the list.

The engine does not import `src/projects/` at all. It is handed
`catalogSource` - how many slots, what sits in each, the empty slot's
thumbnail, how to label a pebble - so the catalog knows nothing about this
particular portfolio's content.

`hasDescription` and `metaRows` moved into the schema too, because the
drawer and the "no description, no drawer" rule have to agree on what counts
as described, and they used to decide separately.


Shared mutable state is one object, passed in
---------------------------------------------

`script.js` kept about a dozen module-level `let`s - `viewState`,
`selectedCube`, `hoveredCube`, `drawerOpen`, `spotlightCube`,
`droppingFrom`, `arrivalStartedAt` and so on - that most of the file read
and several parts wrote.

Splitting the file could not just hand each module its own copy: the
catalog, the detail view, the camera and the tags genuinely have to agree
about which pebble is selected and which mode the view is in. So there is
one `state` object (`engine/state.js`), created in `createEngine` and passed
to the parts that need it. The modules that need a scene, a camera rig or
the grid take those as arguments too (`createCatalog({ scene, grid, state,
... })`), rather than importing a singleton.

The grid is shared the same way: `grid = { pebbles, shape }`, filled by the
catalog and read by the camera. That breaks what would otherwise be a cycle
between them.

The benefit beyond tidiness: **the temporal-dead-zone trap is gone**.
`animate()` used to run its first frame the moment it was defined, before
the rest of the file had executed, so any `const` it touched had to be
declared above it - which is why `TAG_*`, `FLOW_*` and the DOM lookups were
all hoisted to the top of the file with comments saying so. It bit three
times. Now nothing runs until `engine.start()` is called, so declaration
order no longer matters and constants can live where they belong.


Constants live next to what they tune
-------------------------------------

With the TDZ reason gone there was a choice: one big `constants.js`, or each
constant beside the code it governs. They are beside the code - `TAG_*` in
`engine/tags.js`, `FLOW_*` and `BUMP_*` in `pebbles/flow.js`, `SPOTLIGHT_*`
in `pebbles/spotlight.js`, `DETAIL_MARGIN` and the sway in
`camera/framing.js`, and so on - because the comment explaining why a number
is 0.88 and not 1.05 is only useful next to the arithmetic that uses it, and
those comments are most of the value here.

`engine/constants.js` keeps only the handful that several modules must
agree on: `CUBE_SIZE`, `SPACING`, `PEBBLE_RADIUS`, `PEBBLE_SQUASH`, the
pebble size range and `MESH_FIT_SIZE`. Its header lists where everything
else lives, so a constant is still findable without grepping.


Tried and removed
=================

Built, shipped or previewed, and taken out at the user's request.

Catalog
- **Cubes** (box glass with teal edge lines; the cube's outline kept at 0.3
  around the model) - replaced by pebbles. Also shown: bubbles, morphing
  blobs, rounded cubes, plain clouds of points.
- **Teal glass pebbles**, then **pencil-sketched ones** (graphite hatching
  in crossing strokes with a grainy outline - too thick on a phone, then
  dropped): the graphite colour stayed, shaded smoothly.
- **Orbiting the catalog**; on hover, **a pulse** (jitter and ±20% size),
  **a teal tint**, then **orange with the name hanging below** (and the
  spotlit pebble handing over to it) - hover now changes nothing.
- **Labels**: "Explore me..." on the glowing cube; "Project XX" on the cube
  nearest the pointer; names falling like leaves from cubes the pointer
  reached; then the glowing pebble's name as a white chip, as bare orange
  text on its face (unreadable), on a straight rod-like line, and on a taut,
  barely-moving string; the string see-through and fading in from the knot.
- **Small pebbles** among the big ones: one per diagonal gap (too
  organised), then scattered at random and drawn instanced - removed, the
  user didn't like them.
- **Four of the five pebble colour gradients**, previewed behind a
  since-removed `?pebbles=` flag and passed over for the one that drifts
  with the shape: `sanguine` (warming into red chalk where the light falls
  away - the strongest, and the most like a drawing), `edge` (a warm red
  turn at the silhouette only), `field` (one wash across the whole grid,
  each pebble sampling the part it sat in - it needed a shared span uniform
  set at layout, and a `vPebbleWorld` varying, both now gone) and `both`
  (field plus shadow). Each ran off a term the graphite patch already
  computed, so any of them is cheap to bring back; the span and the varying
  are what `field` would need again. Warm grey was too near graphite to
  register across a whole grid, which is why `field` ended up on the
  brown-grey.
- **Send-off variants**: a 2s blow-out; a hard shake and fast fall; a swirl
  and rock; a push-and-hop wave; a tumbling fall with sideways drift;
  waiting for the last cube before the camera moved.

Project view
- **"Drop again" as a button in the bar**, beside the way back - replaced
  by a double-click, hinted on the pile.
- **An orthographic detail view** (`DETAIL_PROJECTION`, still switchable),
  an oblique default, and **`controls.autoRotate`**.
- **Rock Print's first landing view** (`{ elevation: 49, turn: 145 }`).
- **The close-up beside a wide-screen drawer** - it hid the pavilion.
- **The tap hint** as a hand icon, three other drawn designs, and a soft
  glow in orange, blue, then dark grey; also stopping after the first zoom,
  and skipping while zoomed.
- **A single dark-teal ink** for the points.
- **Capping a point's size by the camera** (`gl_PointSize` no bigger than
  `uPointScale * 0.5`), for standing inside Rock Print, where world-sized
  points 0.6 units away draw large: the user wanted them back as they were.

Site
- **A minimum time for the loader** (5s, then ~8.3s), and **its words a
  part at a time** under the progress line ("Nothing here is fixed. / At
  the edge of change, / ..."): the user asked for the loader to last no
  longer than the loading, which now happens behind the landing page, so
  there was no time left for the words.
- **A dark site in cyan** with a `Sky` dome; bridging a paper loader into it
  with a plain fade or a spreading pool of ink.
- **Other loader palettes** (tide, ember, current, aurora, magma), via a
  since-removed `?loaderpreview`; **a 1.6s minimum** for the loader.
