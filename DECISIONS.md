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
- "Still empty...", and tags as HTML over the canvas
- Selecting: pointerup on the canvas, and drags don't count
- Clicking a project knocks the rest of the grid off the screen

The project view: camera
- The detail camera looks along the catalog's screen-up; every move slerps
- The default view, and a project's own `view`
- Fitting allows for depth and for what else is on screen
- The open drawer: the whole model beside it, or a close-up below it
- The model turns; the camera nods (`view.sway`)
- Double-click / double-tap zoom, and the touch-point hint

The project view: point cloud
- Quantized, not Draco-compressed
- A mesh becomes points as it loads
- Emergent Space: aggregates dropped with live physics
- Point size, three sizes, three inks
- Points gather out of a scattered cloud
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
- The start-up loader is inline and waits for real progress
- `?cloudtest`, and why clouds load on click

Tried and removed


The catalog
===========


Pebbles, and a clicked one dissolves into points
------------------------------------------------

Chosen from five rendered options (pebbles, bubbles, morphing blobs,
rounded cubes, clouds of points): pebbles in the grid that turn into a
cloud of points when clicked. **The code still calls them cubes**
(`cubes`, `cubeSize`, `CUBE_FACE_OPACITY`...) and they sit in the cubeSize
grid; renaming would have touched most of the file for nothing.

- **Shape** (`makePebbleGeometry(seed)`): a sphere of `PEBBLE_RADIUS`
  (0.44 x cubeSize), wobbled by a few slow waves (`PEBBLE_LUMPS`), drawn out
  a little (`PEBBLE_STRETCH`), squashed flat (`PEBBLE_SQUASH`); a seed per
  slot. Vertices are merged first so normals are smooth.
- **Flux**: each pebble slowly changes shape, as asked - three broad
  waves rolling over its surface on its own seed (`addPebbleFlux`, in the
  vertex shader; `PEBBLE_FLUX` 9% of the radius, `PEBBLE_FLUX_SPEED`), off
  one shared clock (`pebbleFluxTime`). The glass and the rim run the same
  function on the same seed, or the rim would slip off the glass. Pure
  function of time; clicks and hover still use the resting shape, near
  enough, and the dissolve starts from it.
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
  stands alone in the fog. Framing still fits the invisible cubeSize box.
- **Visited pebbles stay darker**, like visited links: once its project has
  been opened (`markVisited` in `openProject`; "Still empty..." doesn't
  count), a pebble rests in deeper glass with a darker rim. Every state
  that rests or glows takes its base from `restingFaceColor` /
  `restingFaceOpacity` / `restingRimColor` - never write `cubesColor` back
  directly. Ids are kept in `localStorage` (`fluxandflow.visited`); where
  storage is blocked it lasts for the visit.


A fixed number of slots
-----------------------

`SLOT_COUNT = 10` decides how many pebbles exist; the viewport only decides
the arrangement (`computeGridShape` picks the column count closest to the
viewport's proportions, `fitCameraToGrid` frames it). Sizing the grid from
the viewport instead gave 0 pebbles on a portrait phone. A project's `slot`
is stable; its on-screen place isn't, but the order is row-major. Pebbles
sit `spacing` (1.4) cubeSizes apart, centre to centre - 1.2 felt crowded;
`fitCameraToGrid` pulls back to fit whatever the spacing, so they get
smaller on screen as it grows.


A pebble's state is a pure function of its mode and the clock
-------------------------------------------------------------

Every frame each pebble's whole state - pose, colour, opacity, its rock's
scale - is computed fresh from its mode and the clock (`updateIdleCube`,
`updateSpotlightCube`, and the grid-wide `'dropping'` and `'returning'`
modes). Nothing accumulates, so nothing drifts or needs resetting. Colour
goes through `paintGlow(cube, amount)`: 0 is the pebble's resting self, 1
the spotlight's orange.

**Hover changes nothing**: the pebble under the pointer keeps its look and
its float, to be clicked; the spotlight just never starts on it. The
exceptions with memory are the pointer's flow and the hanging tag.

Two traps it sets, both hit for real:

- **A per-frame write beats a one-off tween on the same property.** Closing
  once flipped straight back to `'catalog'`, whose idle update rewrote
  opacity every frame and stomped the reveal's fade. `viewState` stays
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
  About handle (`--warm`; `spotlightGlowColor` kept in step by hand).
- **Showing that orange took two things.** Colours are given as raw screen
  values (`screenColor()`), because the renderer outputs linear values and a
  hex string is converted on the way in (it came out brick red). And the
  face glows through its emissive colour, since the scene's cyan lights turn
  an orange base green; the base is dimmed as the glow rises
  (`SPOTLIGHT_FACE_DIM`). Every reset of a face colour resets emissive too.


The glowing pebble's name hangs on a string
-------------------------------------------

`#spotlight-tag` reads the project's `title` ("Rock Print Pavilion",
"Emergent Space"), or "Project 03".."Project 10" for an empty slot, and
pulses with the glow (down to `SPOTLIGHT_TAG_MIN`, 0.65, between beats - at
0.2 it read as see-through), gone once the pebble settles. Hovering it
changes nothing - the spotlight runs its whole dwell. "Still empty..." wins
on its pebble.

**Size**: the tags scale with the pebbles on screen - `--pebble-px`, their
radius in pixels, set by `fitCameraToGrid` - at 0.3 of it, never under
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
curve (`#spotlight-string`). The tag turns with the string's overall lean,
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
  alone. Zeroed by `resetFlow()` when the drop starts. Its state sits above
  `animate()` (see the TDZ note in CLAUDE.md).


Every pebble holds its thumbnail - the rock, or the project's own model
-----------------------------------------------------------------------

Empty slots use `EMPTY_SLOT_THUMB` (the same rock). `loadThumb` keeps one
promise per path and each pebble adds a `clone()`, so ten rocks are one
187 KB download. `EMPTY_SLOT_THUMB`, `THUMB_INK` and `thumbScenes` sit up
with the projects because `createPlayground()` runs before the rest of the
file (TDZ). A binary `.glb` would be about a quarter smaller than the
`.gltf`.

A project with `thumbSize` shows its own model instead (Emergent Space:
`thumbModel` is the same `aggregate.glb` its project view samples into
points, at 1.9 - the user had 2.4 made 20% smaller). It's centred and scaled
to that longest side, whatever units it was drawn in, and drawn in the
rock's ink as it appears on screen (`THUMB_INK`, an unlit colour) rather
than the file's own material - the aggregate's is a bright, glossy red.
Without `thumbSize` the thumbnail is placed as the rock always was (0.2
scale, 1 unit down). Either way the spotlight pulses it from
`contentBaseScale`.


"Still empty...", and tags as HTML over the canvas
--------------------------------------------------

Clicking an empty slot shows `#empty-tag` on it for `EMPTY_TAG_DURATION`,
fading over `EMPTY_TAG_FADE` - the quiet ink chip, not the orange, since an
empty slot isn't an invitation. Tags are HTML over the canvas, not sprites:
real Fira Sans, sharp at any pixel ratio, styled in CSS, and
`pointer-events: none`. `placeTagOnCube` projects a point on the pebble's
top towards the bottom of the screen.


Selecting: pointerup on the canvas, and drags don't count
---------------------------------------------------------

A pebble is selected by the press's own `pointerup` on the canvas
(`onCanvasSelect`; main mouse button, or any touch or pen), not a `click`
on window - see "Safari". A press that travels over 5px is a drag
(`wasDrag`): it stirs the grid, or orbits in a project, and never selects.


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
with `cameraOrientationLocked` keeping `controls.update()` out until it
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

Rock Print's `{ elevation: 58, azimuth: 4, turn: 102, zoom: { stacked: 1.75,
side: 1.4 }, lift: { stacked: 0.14, side: 0 }, sway: 13 }` was fitted to the
user's phone screenshot: a throwaway build (never committed) froze the turn
and gather and exposed a hook to set the view; renders at the screenshot's
viewport were scored by overlap (IoU) of their point masks, coarse then
fine, which also showed the leftover error was placement - hence `lift`.
The fitted phone zoom 1.9 was eased to 1.75 on request (it cropped the
pavilion); desktop uses 1.4 and no lift. `turn` is the screenshot's 118°
less the 16° the model turns during the gather, so the shot is on screen as
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
(`frameDetailCloseup`: `CLOSEUP_ELEVATION` 38° on the project's heading,
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
a couple of rods; fitting the whole cube showed a small pile.


The model turns; the camera nods (`view.sway`)
----------------------------------------------

The model turns inside the pebble's place, a full turn every 80s
(`DETAIL_ROTATE_SPEED`; 40s read as too fast), computed from
`detailRotateStartTime` (reset when the model appears, which the gather
shares). The fit is computed once at the start angle; Rock Print stays in
frame across a full turn.

`view.sway` (Rock Print 13°) nods the camera that far above and below, over
`SWAY_PERIOD` (16s; 8° over 20s read as too subtle). `updateSway` applies
it as a change from last frame's angle about the camera's right axis
through the target, so it rides on whatever the camera is doing - landing
view, drawer, zoom, the visitor's orbit. It holds while a move is in flight
or the visitor orbits, and until the gather is done, then restarts from
zero with a `SWAY_EASE_IN`, so it never jumps. Only elevation changes.
Opt-in: it would break a square-on default view.


Double-click / double-tap zoom, and the touch-point hint
--------------------------------------------------------

`toggleDetailZoom` moves the camera to `DETAIL_ZOOM` (40%) of its distance
towards the cloud's nearest point under the pointer, keeping the direction
of view; again returns to the frame. A mouse uses `dblclick`; touch
double-taps are timed by hand on `pointerup` by the events' own
`timeStamp` (`DOUBLE_TAP_TIME`, `DOUBLE_TAP_DISTANCE`) - phones don't
reliably send `dblclick`, and where they do it's ignored for touch, or it
would zoom in and straight back out.

`#tap-hint` is a white disc with a black outline and rings that presses
twice (2.2s CSS animation), readable over the cloud, the fog and the paper,
and not competing with the orange. Its size (`--hint-size`) follows the
screen's shorter side, 3vmin between 1.1rem (a phone, as before) and 2.6rem;
it sits at `z-index` 2, over the canvas. `maybeShowTapHint` shows it once
the gather is done, then every `TAP_HINT_GAP` (5s), on a random on-screen
point of the cloud clear of the bar and any side drawer - zoomed in too,
where it invites zooming back out. It skips while the camera moves or a
phone's drawer is open.


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
convert it offline, `loadPointCloudWithShaderMaterial` turns any `.glb` with
no POINTS in it into a cloud (`pointsFromMeshes`): `MESH_SAMPLE_POINTS`
(20,000; a project's `points` overrides it - Emergent Space uses 8,000, as
60,000 and then 20,000 read as solid rods on the aggregate's thin arms)
points scattered over the surface with three.js's `MeshSurfaceSampler`,
shared between meshes by area, in world space (so the file's own rotation
holds), then centred and scaled so the longest side is `MESH_FIT_SIZE`
(cubeSize), since a mesh arrives in whatever units it was drawn in. From
there it is an ordinary cloud: inks, sizes, gather. It downloads a fraction
of what a sampled cloud would weigh (Rock Print's 78k quantized points are
922 KB) and a mesh exported from Rhino or Blender works as it is. A real
point cloud is left exactly as it is.



Emergent Space: aggregates dropped with live physics
----------------------------------------------------

The user asked for three aggregates falling onto a surface and interlocking,
and chose live physics - a fresh drop every time the project opens - over a
drop simulated once and played back, or one exported from their own
Blender/Rhino simulation. A project's `drop: { count, size, ground }` does it
(`src/pile.js`):

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
- **Drawn as points**: one sampled cloud, shared by every copy, each copy a
  THREE.Points that `pile.sync()` moves to its body every frame. The
  surface is a faint disc of points in the grey ink (`userData.tone`).
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
  `PILE_TIME_SCALE` (0.6) - slow motion, which changes nothing about how
  they land.
- **Settle, then turn**: the model's slow turn waits for `pile.settledAt`
  (every body asleep, or `PILE_SETTLE_AFTER`). Reopening calls
  `restart()` for a new drop. The physics steps with the frame time
  (capped like the flow), so a slow device plays it slower rather than
  jumping.
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
the model that condenses over `GATHER_DURATION` (3.6s), each point
spiralling home at its own moment - all in the vertex shader, one uniform a
frame. `addGatherAttributes` gives each point a start (`aScatter`, in the
cloud's own quantized space, where three.js's bounding box also lives) and
a delay (`aGatherDelay`). `setGather` only touches clouds loaded to gather,
or the shader would read a missing start as the origin.


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
accent, the orange invitation. The background is the page, not the scene:
the renderer is transparent (an old `Sky` dome that painted it dark is
gone). Nothing is additive - on paper, adding light draws nothing - so
glass and points blend normally. Scene colours go through `screenColor()`.
The loader's `palette.bg` must stay equal to `--bg`.


Scene fog is off; the grey fog is a page layer
----------------------------------------------

`scene.fog` was `Fog(..., 15, 8)` - near beyond far, which fogged anything
close to the camera; re-adding it needs near < far and a range for both
views. The grey fog behind an open project is `#fog`, a CSS layer between
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

`images` entries (`{ src, alt, caption, ratio }`) render as figures under
the text (`imageFigure`): the first full width, the rest two to a row,
lazy-loaded, framed at their `ratio` so nothing jumps; no `src` is an empty
dashed frame. The panel is 98% opaque so the cloud doesn't muddy them. Rock
Print's five are sized for the drawer - lead 1500px, others 900px, ~1 MB
in all, metadata stripped (CLAUDE.md has the recipe); captions/credits are
still empty.


Asset paths resolve against the Vite base URL
---------------------------------------------

Paths have no leading slash and go through `assetUrl`: Vite's `base`
rewrites the HTML and imports but not strings handed to loaders at runtime,
so absolute paths 404 under GitHub Pages' sub-path. Works at a domain root
too.


Loading
=======


The start-up loader is inline and waits for real progress
---------------------------------------------------------

`#loader` is markup, CSS and a classic script in index.html, so it's on
screen before the ~180 KB (gzipped) bundle arrives. Particles stream along
braided currents around the wordmark, in paper, gathering strength with
progress and pouring into the centre as it fades (`EXIT`, 0.9s). Progress is
real: script.js registers each start-up asset (`bootAsset`), and calls
`window.fluxLoader.finish()` when all are done (failures count as done; a
30s cap). It stays at least `MIN_VISIBLE` (5s), the bar showing the lesser
of real progress and elapsed time so a fast load fills it steadily rather
than jumping to 100%. All its animation runs on elapsed time, not frames.
On a fast load it's gone ~6s after the page opens.


`?cloudtest`, and why clouds load on click
------------------------------------------

`?cloudtest` fills every slot with a copy of the first project, each with
its own `?copy=n` URLs so they download as ten projects would. Its first
version loaded all ten clouds at start-up, measured here (phone viewport,
cache off, gzipped):

| Connection        | Normal: models done | Normal: total | Ten clouds at start-up | total   |
|-------------------|--------------------:|--------------:|-----------------------:|--------:|
| Wi-Fi, 30 Mbps    |               0.8s  |       0.48 MB |                   3.2s | 9.66 MB |
| Fast 4G, 9 Mbps   |               1.0s  |       0.48 MB |                   9.2s | 9.66 MB |
| Slow 4G, 1.6 Mbps |               2.5s  |       0.48 MB |                  49.2s | 9.66 MB |

So clouds load only when a project is opened; ten rock thumbnails cost
~2 MB. Remove the flag once real projects fill the grid.


Tried and removed
=================

Built, shipped or previewed, and taken out at the user's request.

Catalog
- **Cubes** (box glass with teal edge lines; the cube's outline kept at 0.3
  around the model) - replaced by pebbles. Also shown: bubbles, morphing
  blobs, rounded cubes, plain clouds of points.
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
- **Send-off variants**: a 2s blow-out; a hard shake and fast fall; a swirl
  and rock; a push-and-hop wave; a tumbling fall with sideways drift;
  waiting for the last cube before the camera moved.

Project view
- **An orthographic detail view** (`DETAIL_PROJECTION`, still switchable),
  an oblique default, and **`controls.autoRotate`**.
- **Rock Print's first landing view** (`{ elevation: 49, turn: 145 }`).
- **The close-up beside a wide-screen drawer** - it hid the pavilion.
- **The tap hint** as a hand icon, three other drawn designs, and a soft
  glow in orange, blue, then dark grey; also stopping after the first zoom,
  and skipping while zoomed.
- **A single dark-teal ink** for the points.

Site
- **A dark site in cyan** with a `Sky` dome; bridging a paper loader into it
  with a plain fade or a spreading pool of ink.
- **Other loader palettes** (tide, ember, current, aurora, magma), via a
  since-removed `?loaderpreview`; **a 1.6s minimum** for the loader.
