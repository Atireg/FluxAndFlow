Decisions
=========

Why things are the way they are, where the code alone would not say. Each
entry names what was chosen, what it was chosen over, and what would have
to change to revisit it. Read the relevant entry before changing the camera
or projection maths, the colours, the point-cloud pipeline or the drawer.

Features that were built and then taken out are at the end, under "Tried
and removed", so they aren't re-proposed without knowing how they went.


Contents
--------

The catalog (the grid of cubes)
- The catalog has a fixed number of slots
- A cube's visual state is a pure function of its mode and the clock
- The spotlight: any cube, held still, in the one orange
- Moving the pointer through the grid stirs it; the grid doesn't orbit
- Every cube shows the rock, from one download
- Clicking an empty slot answers with "Still empty..."
- Clicks are distinguished from drags
- Clicking a project knocks the rest of the grid off the screen first

The project view: camera
- The detail camera looks along the catalog's screen-up, and every move slerps
- The default detail view is a one-point perspective, square-on
- A project can set its own camera angle (Rock Print's landing view)
- Fitting has to allow for depth, and for what else is on screen
- The open drawer: the whole model beside it, or a close-up below it
- The model rotates slowly once a project is open
- The camera nods slowly up and down (`view.sway`)
- Double-click or double-tap zooms in on the model
- A touch point keeps hinting at the double-tap zoom

The project view: point cloud
- The point cloud is quantized, not Draco-compressed
- Point size: computed in JS, three random sizes, semi-transparent
- Each point is one of three inks, at random
- Rock Print's points gather out of a scattered cloud when it opens

Page, colour and drawer
- The whole site is paper
- Scene fog is off; the grey fog is a page layer
- Faded cube faces must not write depth
- A project with no description has no drawer
- The bar's title moves into the drawer on a narrow viewport
- The drawer has frames for pictures, open until the pictures exist
- Asset paths resolve against the Vite base URL

Loading
- The start-up loader is inline in index.html, and waits for real progress
- `?cloudtest`: ten copies of Rock Print, as a load test

Tried and removed


The catalog
===========


The catalog has a fixed number of slots
---------------------------------------

`SLOT_COUNT = 10` decides how many cubes exist; the viewport only decides how
they are arranged. `computeGridShape` picks the column count whose proportions
sit closest to the viewport's, and `fitCameraToGrid` frames the result.

It used to be the other way round: the grid was sized from the viewport's
aspect ratio, which gave 0 cubes on a portrait phone, 6 at 1280x720 and 8 on
an ultrawide - projects would have become unreachable on narrow screens.

A project's `slot` is stable across reloads and resizes. Its on-screen place
is not (a slot sits elsewhere on a phone than on a desktop), but the order
is row-major and constant, so "the first one" is always the first one.


A cube's visual state is a pure function of its mode and the clock
------------------------------------------------------------------

Every frame, each cube's whole visual state - position, rotation, scale,
colour, opacity, its thumbnail's scale - is computed fresh from its mode and
the clock. Nothing is incremented or accumulated, so nothing drifts, and
nothing needs resetting when a mode ends. `updateCube()` picks the mode;
`updateIdleCube()` / `updateHoveredCube()` / `updateSpotlightCube()` each
write a complete state, not a diff. Two grid-wide modes follow the same
rule: `'dropping'` (the send-off, `updateDroppingCube`) and `'returning'`
(the way back, `placeAtRest`). Pulses are multiples of a stored base value
(`contentBaseScale`), never absolute numbers. A hovered cube doesn't
pulse: it keeps its float (`placeAtRest`) and only takes the deeper teal
tint (`HOVER_FACE_OPACITY`), so it neither jumps out of its drift nor
competes with the spotlight's jump.

This replaced two racing loops (a bounce in the render loop plus a separate
hover-only `requestAnimationFrame` loop) that had two live bugs: un-hovering
reset edges to the wrong colour for good, and the thumbnail jumped to ~5x
on hover and then settled 25% smaller than it started. Both are gone by
construction.

The one deliberate exception is the pointer's flow (a spring with memory -
see "Moving the pointer through the grid stirs it"), added on top of each
mode's state and zeroed on leaving the catalog.

Two traps this scheme sets, both hit for real:

- **A per-frame write beats a one-off tween on the same property.** Closing
  a project used to flip `viewState` back to `'catalog'` at once;
  `updateIdleCube()` then wrote `opacity = 1` every frame and stomped the
  reveal's fade, so a wall of opaque faces appeared at point-blank range in
  front of the still-retreating camera. `viewState` now stays `'returning'`
  until the reveal's tweens are done (`gsap.delayedCall`), and the reveal
  eases in (`power2.inOut`) so it follows the camera's own move.
- **The clicked cube carries whatever the click caught it holding** into
  the detail view, where its edges must stay square to the canvas. So
  `openProject` zeroes its rotation and scale and resets its face colour,
  emissive and edge colour. Anything a catalog effect can change on a cube
  has to be reset there.

The catalog's per-cube update only runs in `'catalog'`. The spotlight's
timers are plain comparisons against the clock, so they need no pausing
while a project is open.


The spotlight: any cube, held still, in the one orange
------------------------------------------------------

Every ~5.3-5.6s one cube glows orange and jumps, then the next takes over.

- **Any cube is eligible, empty slots included.** At this cadence the
  spotlight reads as the grid's ambient life rather than a call to action;
  restricting it to the one project would leave most of the grid inert.
  The hovered cube is excluded (the two would fight over the same fields),
  and so is the cube that just finished, so it visibly moves on.
- **It holds still while it jumps**, no wander - where its float had it
  when the spotlight began. Two motions on one cube read as busy; holding
  still while the rest drift is part of the signal. Its pose is blended
  with the live float by the spotlight's intensity, which eases in over
  `SPOTLIGHT_FADE_IN` (0.6s) and out over `SPOTLIGHT_FADE_OUT` (1.6s), both
  smoothstepped, so it leaves and rejoins its float without a jump. (Held
  at its bare slot, it used to snap up to 2 units in one frame back to its
  float as the dwell ended.)
- **One orange for "click me"**, `#ff8c32`: the spotlit cube and the
  drawer's About handle (`--warm` in styles.css, with `--warm-rgb` and
  `--warm-deep`; `spotlightGlowColor` in script.js is kept in step by
  hand). It went dark red, then a lighter red, then orange, as asked.
- **It carries its name, blinking.** `#spotlight-tag` reads "Project 01"
  to "Project 10" by grid slot, empty slots included (every cube reads as
  a project to come). Its opacity is computed in `updateCubeTags` from the
  same beat and ramp the cube glows by - brightest when the cube is most
  orange, down to `SPOTLIGHT_TAG_MIN` (20%) between beats, all scaled by
  `spotlightIntensity` - so it blinks in step with the orange and has
  faded out exactly when the cube is back in its float. No CSS transition
  on it, which would smear the blink. A hover ends the spotlight, and the
  name with it; "Still empty..." wins on the same cube. It's bare orange
  text (`--warm`) with a soft paper-coloured `text-shadow` halo, so it stays
  legible over the cube's own orange face; if it reads too faint there, a
  deeper orange is the lever, not a chip behind it.

Getting the cube to actually show that orange took two things:

- Colours are given as raw screen values (`setRGB(..., LinearSRGBColorSpace)`,
  now `screenColor()`), not hex strings. The renderer outputs linear values
  straight to the screen, and a hex string is converted on the way in -
  which crushed the orange's green channel into brick red.
- The face glows through its emissive colour, not its base colour. The
  scene's lights are cyan (`#86cdff`), which turned an orange base green;
  emissive isn't lit. The base is dimmed as the glow rises
  (`SPOTLIGHT_FACE_DIM`) or the lit grey under it washes the orange to tan.
  Every place that resets a face colour also resets its emissive to black.


Moving the pointer through the grid stirs it; the grid doesn't orbit
---------------------------------------------------------------------

Asked for: stop the orbit in the catalog, make the cubes float more, and
respond to the mouse.

- **No orbit.** `controls.enabled` is false in the catalog and true only in
  a project. `controls.update()` still runs every frame (`enabled` only
  gates input), and `moveCamera` relies on that to resync after its moves.
- **Float.** The wander is bigger (`WANDER_XZ_AMPLITUDE` 0.38) and each cube
  rocks gently as it drifts (`WANDER_TILT`, 0.05 rad). The sway stays under
  half the 1-unit gap, so neighbours don't meet.
- **Flow.** The pointer moving through the grid carries nearby cubes along,
  like a hand through water, and they lean the way they're carried. Each
  cube's target offset is the pointer's recent velocity times `FLOW_CARRY`,
  scaled by a Gaussian of distance (`FLOW_RADIUS`), capped at `FLOW_MAX`,
  followed on an under-damped spring (`FLOW_STIFFNESS`, `FLOW_DAMPING`),
  integrated in fixed small steps. Only motion pushes: a resting cursor
  exerts nothing, so the cube you're aiming at stays put. (Attracting or
  repelling cubes from the cursor was passed over for exactly that reason.)
  It listens to `pointermove`, so a finger dragged on a phone stirs it too.

It's applied on top of each mode's state, only in `'catalog'`, and zeroed
by `resetFlow()` when the drop starts. Its constants and state sit above
`animate()` - see the TDZ note in CLAUDE.md.


Every cube shows the rock, from one download
--------------------------------------------

Every cube holds a little rock, not only Rock Print's; empty slots use
`EMPTY_SLOT_THUMB` (the same rock) and still answer a click with "Still
empty...". `loadThumb` keeps one promise per file path and each cube adds
its own `clone()` (geometry and materials shared), so ten rocks are one
187 KB download. A thumbnail that arrives while a project is open stays
hidden until it closes.

`EMPTY_SLOT_THUMB` and `thumbScenes` sit next to the projects rather than
next to `loadThumb`, because `createPlayground()` loads thumbnails before
that part of the file has run (it crashed with a TDZ error otherwise).

The rock is a `.gltf` with base64-embedded data (~170 KB gzipped); a binary
`.glb` would be about a quarter smaller - worth doing for real thumbnails.


Clicking an empty slot answers with "Still empty..."
----------------------------------------------------

`#empty-tag` appears on the clicked empty cube, held for most of
`EMPTY_TAG_DURATION` (1.6s) and faded over the last `EMPTY_TAG_FADE` (0.3s),
computed from the click time like everything else per-frame. Clicking again
restarts it; it's dropped as soon as the catalog isn't on screen. It's the
quiet ink-on-panel chip, not the orange: orange is the invitation, and an
empty slot isn't one. The only other word on the grid is the orange
cube's blinking name (see the spotlight entry); "Tried and removed" lists
the labels that came and went before it.

It's HTML laid over the canvas, not a sprite or text mesh in the scene:
HTML gets the real Fira Sans, stays sharp at any pixel ratio and restyles in
CSS. `pointer-events: none`, so clicks go through to the cube.
`placeTagOnCube` projects a point on the cube to screen pixels every frame:
on the lower part of its top face (`cubeSize * 0.36` towards the bottom of
the screen from its centre) rather than above it, since a top-row cube has
no room above it on a tight frame, and below the face's centre to clear the
rock inside.


Clicks are distinguished from drags
-----------------------------------

A press that travels more than 5px is a drag, not a click (`wasDrag`).
Originally this stopped an orbit from opening whichever cube it ended on;
the catalog no longer orbits, but a drag now stirs the grid and letting go
shouldn't open a cube. In a project it keeps orbiting by hand from counting
as a tap.


Clicking a project knocks the rest of the grid off the screen first
--------------------------------------------------------------------

A click doesn't open the project straight away. First a boom: one shockwave
from the clicked cube knocks every other cube outward (`BOOM_PUSH`) and up
towards the camera (`BOOM_LIFT`), settling exponentially (`BOOM_SNAP`,
0.07s) - no bounce - and reaching further cubes slightly later
(`BOOM_WAVE`). They hang until `BOOM_HANG` (0.3s), then fall slowly off the
bottom of the screen (`DROP_FALL` 1.4s, staggered by up to `DROP_STAGGER`),
quadratic like gravity. The clicked cube holds still. `openProject` runs
`DROP_OPEN_AFTER` (0.65s) into the fall, so the camera is already moving
while the others are still on screen. Nothing oscillates, rotates or
drifts sideways: each of those was tried and asked to be removed (see
"Tried and removed"); what was wanted was "an instant boom and then slow
fall".

"Down" is down the screen, which from the overhead catalog camera is world
+Z (world-down would just shrink them into the distance). They also sink a
little away from the camera (`DROP_SINK`) so a falling cube passes behind
the chosen one.

It's a mode in the pure-function scheme (`'dropping'`,
`updateDroppingCube`), not gsap tweens per cube, which would fight the
per-frame writes. Once the project opens, `animate()` keeps calling
`placeDroppingCube` (pose only - the material is left to `openProject`'s
fade) until `dropInProgress` says the last cube is done.

The camera's move in uses `OPEN_CAMERA_EASE` (`power2.out`), not the usual
`power2.inOut`: the falling cubes already carry the motion, so the camera
sets off at speed. Waiting for the last cube to clear and then easing in
from rest read as a clumsy pause. On a first visit the model is still
downloading when the move starts; when it lands mid-move, the re-frame
finishes within the time the move had left, with the same ease, rather than
restarting from rest.

Closing uses `'returning'`: every cube is placed at rest each frame
(`placeAtRest`, idle minus opacity), so the grid fades back in already
home. Click, hover, Escape and resize only act in `'catalog'` or
`'detail'`, so they ignore both transitional modes.

All the timings and distances are named constants next to `startDrop`.


The project view: camera
========================


The detail camera looks along the catalog's screen-up, and every move slerps
---------------------------------------------------------------------------

Opening and closing a project both used to roll the whole grid 90°. The two
views disagreed about "sideways": the catalog camera looks straight down
with +X to its right and -Z up the screen, while the detail camera looked
along +X, putting +Z to its right. Any move between those has to roll 90°
somewhere. On close it happened in a single frame at the exact overhead
point - the pole of OrbitControls' spherical maths, where heading is
undefined.

The fix removes the roll at its source. The detail camera's default heading
(azimuth 0 in `viewDirection`) sits on +Z looking along -Z, the catalog's
own screen-up, so +X is screen-right in both views and every transition is
a pure tilt about world X. The model was authored to be seen from -X, so
`DETAIL_MODEL_YAW` turns it a quarter to show the same face.

Orientation is never left to OrbitControls during an animated move.
`moveCamera` tweens position and target, and separately slerps the
quaternion to exactly where `Matrix4.lookAt` would leave it at the
destination; `cameraOrientationLocked` keeps `controls.update()` from
fighting it until it lands. All animated moves (`frameDetail`,
`frameDetailCloseup`, `toggleDetailZoom`, `fitCameraToGrid({ animate: true })`)
go through it. `moveCamera` and `animateFov` cancel any move still in
flight first - without that, an open outlasted a quick close and dragged
the camera back.

How to verify: on a pure tilt about X the quaternion's Y and Z stay exactly
0. Logging them every frame through open / drawer / back on both layouts
gives 0.0000 for a default-view project; for Rock Print they peak at about
0.03, its intentional 4° azimuth.

To revisit: if the catalog's axes ever change, azimuth 0 has to follow the
catalog's screen-up or the roll comes back. A project's `view.azimuth`
turns the grid by exactly that much on the way in and out, so keep it
small.


The default detail view is a one-point perspective, square-on
-------------------------------------------------------------

For a project without its own `view`: the camera sits on the Z axis looking
straight at the cube, so its edges stay parallel to the canvas and depth
converges on one central vanishing point. An oblique three-quarter view made
edges converge two ways and nothing read as square; `DETAIL_PROJECTION =
'orthographic'` was tried and read flat.

`DETAIL_FOV` is per layout - 45° side by side, 30° stacked. A phone's narrow
frame at 45° shows the cube's top and bottom faces receding at once, which
reads as a tunnel.

`controls.autoRotate` stays off: it orbits the camera, turning the cube's
edges off-axis. The slow rotation that does exist turns the model inside
the cube instead (see "The model rotates slowly").


A project can set its own camera angle (Rock Print's landing view)
------------------------------------------------------------------

A project's `view` sets its landing shot, in degrees: `elevation` above the
horizon, `azimuth` around the model, `turn` (how far the model is spun when
it appears, on top of `DETAIL_MODEL_YAW`), plus:

- `zoom`: how much closer than the cube's fit the camera comes, along the
  line of sight. Above 1 the cube runs off the edges, so the "drop the cube
  until its top clears the bar" placement is skipped.
- `lift`: how far up the screen the model sits, as a share of its height.

`zoom` and `lift` can be one number or `{ side, stacked }` (`perLayout`).
Both are ignored with the drawer open on a phone, which has its own
close-up; beside the drawer on a wide screen the view is kept.

Framing with a `view` differs from the default (in `frameDetail`, behind
`framesCube`): it fits the cube, not the model's bounding box (the box
around scattered ground points balloons and changes as the model turns);
it uses `VIEW_FRAME_MARGIN` (1.16), not `DETAIL_MARGIN`; and on a phone
with the drawer parked it centres on the whole screen when the cube's top
(projected from its eight corners) clears the bar, dropping only as far as
it must otherwise.

Rock Print's view - `{ elevation: 58, azimuth: 4, turn: 86, zoom: { stacked:
1.75, side: 1.4 }, lift: { stacked: 0.14, side: 0 }, sway: 13 }` - was
fitted to a phone screenshot the user supplied, not eyeballed (`sway`, added
later, is the slow nod - see "The camera nods slowly up and down"). A
throwaway build (never committed) froze the slow turn, finished the gather
instantly and exposed a hook to set the view; renders at the screenshot's
viewport (412x762) were scored by how well their orange/red point masks
overlap the screenshot's (IoU), on a coarse grid of elevation, turn and
zoom, then finer. Letting the render slide showed the remaining error was
placement, not angle - hence `lift`. Result: zoom 1.9, overlap 0.8-0.9 with
a 3px residual shift. The stacked zoom was then eased back to 1.75, as
asked, since on the phone it cropped the pavilion. The same zoom and lift
take the pavilion's top off on desktop, so `side` uses 1.4 and no lift.

The model never stops turning, so `turn` is set for the moment the gather
completes and the pavilion first appears whole: the screenshot's 118° less
the 32° it turns during `GATHER_DURATION`. If `GATHER_DURATION`,
`DETAIL_ROTATE_SPEED` or `DETAIL_MODEL_YAW` changes, `turn` shifts with it.


Fitting has to allow for depth, and for what else is on screen
--------------------------------------------------------------

Under perspective the face nearest the camera projects larger than the box's
centre, so `frameDetail` adds the box's extent along the view axis.

The free area is computed per axis: the drawer takes width side by side and
height stacked, and the project bar takes height off the top. Stacked
layouts reserve the bar's measured height (`barFraction()`, live from the
DOM); side by side reserves nothing, since the bar sits clear of a model
framed into the other half.

`DETAIL_MARGIN` (default view only) is above 1 where the whole box should fit
with air, below 1 where the view should crop in. A phone with the drawer
parked crops: the frame is far taller than the pavilion is deep, so the fit
is width-limited and the whole box would leave the model marooned in a thin
band. With the drawer out, height becomes the limit and the same crop would
take the cube's top off, so the margin goes back past 1. Reserving vertical
space can't make a width-limited model bigger - it only moves it.


The open drawer: the whole model beside it, or a close-up below it
------------------------------------------------------------------

`frameWithDrawerOpen` picks the frame while the drawer is open, used by
`setDrawer`, resize, a model landing with the drawer already out, and
zooming back out.

On a wide screen (`side`, 860px and up) the drawer sits beside the model,
so the model moves left and stays whole: `frameDetail` already fits into
whatever the drawer leaves free (`freeW`, `ndcX = -fraction`), and a
project with its own `view` keeps it there, `side` zoom included (Rock
Print 1.4 - the pavilion stays inside the space left of the drawer as it
turns and nods). The touch-point hint and the double-tap zoom work there
too; the hint is kept clear of the drawer, and a zoom centres the tapped
spot in the visible space rather than under the drawer's edge.

On a narrow screen (`stacked`) the drawer covers the lower half, so it's the
close-up, `frameDetailCloseup`: a closer, elevated crop (`CLOSEUP_ELEVATION`
38°, `CLOSEUP_DISTANCE_FACTOR` of the model's radius) on the project's own
heading - an atmospheric shot behind the text, not the reference view, so
the whole piece doesn't have to fit. Closing the drawer returns to
`frameDetail`. The two share a heading, so the move is a pure tilt like
every other.

It keeps the project's azimuth but not its elevation: Rock Print's steeper
landing angle left only fragments of pillars in the strip a phone has above
the open drawer. The values are flat constants that suit Rock Print's wide,
low silhouette; a tall, thin project might need its own.


The model rotates slowly once a project is open
-----------------------------------------------

The model turns around its own Y axis, a full turn every 40s
(`DETAIL_ROTATE_SPEED`). This turns `cube.userData.detail` inside the cube -
the cube's edges stay put, unlike under the rejected `autoRotate`, which
orbited the camera around a square-on view. (A project with `view.sway`
also nods its camera, slowly and only in elevation - next entry.)

Computed as `modelStartYaw(project) + (elapsedTime - detailRotateStartTime)
* DETAIL_ROTATE_SPEED`, not accumulated. `detailRotateStartTime` is reset
when the model becomes visible (both the cached and the just-downloaded
path in `openProject`), so it always appears showing the same face, and the
gather shares that start.

The fit is computed once, at that starting angle, not as the model turns.
Sampled across a full turn on both layouts and drawer states, Rock Print
stays inside the frame; a project whose footprint is closer to the frame's
edges would need this revisited.


The camera nods slowly up and down (`view.sway`)
-------------------------------------------------

Asked for: the camera slowly rotating upwards and back down while Rock
Print turns. A project's `view.sway` (degrees; Rock Print 13) makes the
camera swing that far above and below its place, around what it's looking
at, over `SWAY_PERIOD` (16s) - a second, slower motion under the model's
40s turn. Opt-in, since on a default square-on project it would break the
one-point perspective.

`updateSway` applies it as a change from last frame's angle - a turn about
the camera's own screen-right axis through `controls.target` - not as an
absolute pose. So it rides on whatever the camera is doing: the landing
view, either drawer frame, a double-tap zoom, or wherever the visitor has
orbited to; OrbitControls just sees a camera that moved and re-aims it.
It holds while anything else drives the camera (`cameraOrientationLocked`,
the visitor's hand via OrbitControls' `start`/`end`) and, for a gathering
cloud, until the gather is done - so the fitted landing shot is untouched.
Every time it resumes it restarts from zero at the camera's current place
and grows in over `SWAY_EASE_IN` (2s, smoothstep), so there's never a jump;
a pause mid-nod simply leaves the camera where the nod had it, as the new
base. It only changes elevation (the axis is horizontal, the camera having
no roll), so the "transitions only tilt" rule holds.

13° over 16s (8° over 20s at first read as too subtle) swings Rock Print
from looking down into the plan (71°) to a low, nearly side-on view of the
pillars (45°); checked on both layouts, the pavilion stays in frame at
both ends.


Double-click or double-tap zooms in on the model
------------------------------------------------

`toggleDetailZoom` moves the camera to `DETAIL_ZOOM` (40%) of its distance,
towards the cloud's nearest point along the pointer's ray (a points raycast,
`threshold` 0.06; a miss zooms towards the middle), keeping the direction of
view - a straight move in, no turn. Doing it again returns to `frameDetail`
(or `frameWithDrawerOpen` if the drawer is open). With the drawer open
beside the model, the spot is centred in the space left of it, not at the
screen's centre under the drawer. Any re-frame clears the zoomed state.

Mouse and touch are handled separately. A mouse sends `dblclick`. Touch
double-taps are timed by hand on `pointerup` (`DOUBLE_TAP_TIME` 350ms,
`DOUBLE_TAP_DISTANCE` 30px), since phones don't reliably send `dblclick` -
but some do, which would zoom in and straight back out, so `dblclick` is
ignored unless the last pointer was a mouse. Taps are timed by the events'
own `timeStamp`, not when they're handled: a busy frame pushed a real 285ms
double-tap past a 300ms limit.


A touch point keeps hinting at the double-tap zoom
--------------------------------------------------

`#tap-hint` is a soft touch point with two rings, over the canvas. Each
showing is one 2.2s CSS animation: fade in to 90% opacity, press twice
with a ring spreading on each press (the gesture itself), fade out.

It's a crisp white disc with a black outline (`--hint-fill`, `--hint-line`)
and black rings: it reads over the orange-and-red cloud, the grey fog and
the paper alike, and doesn't compete with the orange that marks clickable
things. The fingertip design was picked from four drawn options; its
earlier looks are under "Tried and removed".

`maybeShowTapHint`, each frame in the project view: first once the points
have gathered (`GATHER_DURATION` + `TAP_HINT_AFTER_GATHER`), then every
`TAP_HINT_GAP` (5s, as asked), each time on a random point of the cloud
projected to the screen, retried until it's comfortably on screen and clear
of the bar (up to 60 tries - zoomed in, most of the cloud is off screen).
It skips its turn with the drawer open on a phone (where it covers the
model) or while the camera moves; beside the drawer on a wide screen it
shows, kept clear of the drawer. Otherwise it keeps coming, zoomed in
included, where it invites the double-tap back out. A zoom clears any hint
mid-tap.


The project view: point cloud
=============================


The point cloud is quantized, not Draco-compressed
--------------------------------------------------

`RockPrintStructureReduced.glb` declared `KHR_draco_mesh_compression` but no
primitive used it: 78,637 points of raw float32, 2.2 MB, plus a 336 KB
decoder download on first click that decoded nothing. Draco doesn't apply
here at all - it covers indexed triangles, and this is a non-indexed POINTS
primitive, which the encoder skips. `KHR_mesh_quantization` does: POSITION
as normalised int16, COLOR_0 as normalised uint8, 28 bytes per point down to
10. 2.2 MB -> 922 KB, at about a millimetre of precision.

COLOR_0 (the scanned colours) is still in the file but no shader reads it -
the points are drawn in `POINT_INKS`. Dropping it would save ~315 KB if the
scanned colours are never wanted.

`static/draco/` keeps the decoder for any future model that genuinely uses
Draco.


Point size: computed in JS, three random sizes, semi-transparent
----------------------------------------------------------------

`uPointScale` carries pixels-per-world-unit from JS and `uSizeAttenuation`
decides whether depth divides it, so a point keeps its world size under
either projection and across pixel ratios. (The shader used to divide by
depth with a hand-tuned constant, which only works under perspective.)

Each point's `aScale` is one of `POINT_SIZES` (0.6, 1, 1.6; the original
size is the middle one), picked once at load, so a point keeps its size as
the model turns. The most ink a point lays down is capped at
`POINT_OPACITY` (0.6), so overlaps build density rather than reading as a
solid surface.


Each point is one of three inks, at random
------------------------------------------

Every point is one of `POINT_INKS` - dark red, the invitation's orange, a
warm grey - picked at load in the proportions each ink's `share` sets, and
stored per point (`aTone`), so the speckle turns with the model instead of
flickering. To change the mix, edit `POINT_INKS`; the shader takes exactly
three (`uInks[3]` and the pick in fragment.glsl), so changing the count
means changing both.


Rock Print's points gather out of a scattered cloud when it opens
-----------------------------------------------------------------

On every open, the cloud starts as a loose, flattened ball around the model
and condenses into the pavilion over `GATHER_DURATION` (3.6s), each point
spiralling in at its own moment. Opt-in per project (`gather: true`).

It runs entirely in the vertex shader. `addGatherAttributes` gives each
point a start position (`aScatter`, within `GATHER_SCATTER` times the
model's half-width, squashed vertically) and a delay (`aGatherDelay`). The
shader eases each point home as `uGather` goes 0 to 1, starting within the
first `GATHER_SPREAD` (40%) by its delay, swirling round the vertical axis
by up to `GATHER_SWIRL`. Scattered points are lighter ink and reach full
weight as they arrive (`vArrived`). Per frame it costs one uniform write.

Start positions are generated in the cloud's own quantized attribute space
(-1..1), where three.js's bounding box is also computed, so nothing needs
converting. It's driven from `detailRotateStartTime`, so it replays every
open and shares a start with the rotation. `setGather` only touches clouds
loaded to gather - otherwise the shader reads a missing start as the origin
and flies every point in from the middle.


Page, colour and drawer
=======================


The whole site is paper
-----------------------

Dark ink (`--ink` #0e1d24) on a warm light ground (`--bg` #f0ede6), a deep
teal accent (#1f5f6b), and the orange invitation. Asked for after the
loader went paper, rather than bridging a light loader into a dark site.
Three things in the scene had to change with it:

- **The background is the page, not the scene.** The old near-black was a
  three.js `Sky` dome. It's gone; the renderer is transparent
  (`alpha: true`), so the background is only ever `--bg`.
- **No additive blending.** On paper, adding light draws nothing. Faces are
  tinted glass (`CUBE_FACE_OPACITY` 0.14, `HOVER_FACE_OPACITY` 0.3,
  `SPOTLIGHT_FACE_OPACITY` 0.6) and points are ink with normal blending;
  the point material doesn't write depth.
- **Scene colours are screen values**, through `screenColor(r, g, b)` (see
  the spotlight entry for why hex strings came out wrong).

The loader's `palette.bg` in index.html must stay equal to `--bg`, or the
loader's exit becomes a visible jump again.


Scene fog is off; the grey fog is a page layer
----------------------------------------------

`scene.fog` is null. It was `Fog('#04343f', 15, 8)` - near beyond far,
which inverts it: everything nearer than 15 units fully fogged. The catalog
(~29 units out) never showed it; the detail view (~10 units) fogged the
cube into the background. Re-adding scene fog means near < far and a range
that suits both views.

The grey fog that rolls in behind an open project ("like a slow grey fog
coming in") is `#fog`, a fixed page layer between the paper and the
transparent canvas. `openProject` adds `.is-in` (3.2s in); `closeProject`
removes it (1.2s out). It's a radial gradient - lighter in the middle, so
the model sits in a clearing - with two soft banks drifting across it (CSS
keyframes, still under reduced motion). Scene fog would grey the model by
distance, a different effect; a page layer touches nothing in the scene and
costs nothing in the renderer.


Faded cube faces must not write depth
-------------------------------------

In the detail view the cube's faces fade to opacity 0 but would keep writing
depth, so the invisible front face hides the cube's own back edges and the
one-point perspective reads flat. `depthWrite` is false while a project is
open and restored on close (after a short delay, with the reveal).


A project with no description has no drawer
-------------------------------------------

`hasDescription` gates the drawer's handle: any of `year`, `role`,
`context`, `body`, `credits` or `images`. An unwritten project shows its
model and title only, rather than a handle onto an empty panel. Placeholder
copy is not published - "Your role on the project" looks broken, and the
role must not be stated until it can be stated accurately. (Rock Print's
current body text is a placeholder to be replaced by the user's own copy.)


The bar's title moves into the drawer on a narrow viewport
----------------------------------------------------------

On a small phone the bar's title and the open drawer both took height off
the same budget and the model shrank to a postage stamp. Shrinking the
drawer was rejected (it costs room everywhere and still leaves the drawer
without a title). Instead the drawer's header carries the title when open
below 860px, and the bar's copy hides via `body.drawer-open`.
`barFraction()` picks up the smaller bar on the next frame.

`.bar__title` crossfades (`opacity`/`visibility`, 0.3s) rather than toggling
`display`: on closing with the drawer open, the bar's title came back
instantly while the drawer's was still fading, and both showed at once.
It's also `white-space: nowrap` - one line at every width from 320px up; a
future title too long for a narrow phone ellipsises.


The drawer has frames for pictures, open until the pictures exist
-----------------------------------------------------------------

A project's `images` is a list of `{ src, alt, caption, ratio }`;
`showProject` renders each as a `<figure>` under the body text
(`imageFigure`). The first spans the width, the rest sit two to a row.
`ratio` is a CSS aspect ratio (3 / 2 by default), so frames have their size
before pictures load. An entry with no `src` is an empty dashed frame,
`aria-hidden`. Pictures load lazily. The drawer went 94% -> 98% opaque so
the point cloud doesn't muddy the pictures.

Rock Print has five, supplied by the user: the lead (the pavilion beside
the church) at 1500px wide, ~450 KB, and four at 900px, 95-165 KB, about
1 MB in all, re-saved as progressive JPEG at quality ~80 with metadata
stripped. The sizes follow the drawer: the lead shows at ~450px wide on a
desktop and the two-up pictures at ~220px, so these stay sharp at 2x pixel
density without shipping the 2000px originals. `ratio` is each file's own
width / height, so frames don't jump when the pictures arrive. Each has an
`alt` describing what it shows; `caption` is empty until there's a credit
or caption to give.


Asset paths resolve against the Vite base URL
---------------------------------------------

Paths in `projects` and `setDecoderPath` have no leading slash and go
through `assetUrl`. Vite's `base` rewrites index.html and bundle imports but
not strings handed to a loader at runtime, so absolute paths would 404 under
a sub-path (as on GitHub Pages) while the page itself loaded. Verified at a
domain root and under a sub-path, so a custom domain needs no code change.


Loading
=======


The start-up loader is inline in index.html, and waits for real progress
-------------------------------------------------------------------------

`#loader` is markup, CSS and a small classic script written into index.html
ahead of everything else. The main bundle is ~690 KB (~180 KB over the
wire); a loader inside it couldn't appear until all of that had run, which
on a slow connection is exactly when a loader is needed.

Design: "flux and flow" literally - particles streaming along slowly
drifting, braided currents (layered sine waves), the wordmark and a hairline
progress bar, in paper (dark teal-black ink turning to orange by flow
direction, drawn one stroke per shade, not per particle). The flow gathers
strength with progress; on exit the streams pour into the centre while the
loader fades (`EXIT`, 0.9s, in step with `.loader.is-leaving`) over the
already-drawn grid. Under reduced motion it draws still streamlines and only
the bar moves. Six palettes were compared on the live site; paper won. To
change colours, edit `palette` in index.html.

Progress is real: script.js registers every start-up asset with
`bootAsset()` (the noise texture and each thumbnail file, once per file),
reports byte progress where the server gives a length, and calls
`window.fluxLoader.finish()` once `sealBoot()` has run and all are done -
two frames later, so the grid is drawn behind it. A failed load counts as
done, and the loader gives up after 30s regardless. It stays up at least
`MIN_VISIBLE` (5s) so it reads as an opening, not a flash, however fast
the load. The bar is paced to match: it shows
the lesser of real progress and elapsed time over `MIN_VISIBLE`, so on a
fast load it fills steadily across the five seconds instead of racing to
100% and sitting there; on a slow load real progress governs. All
its animation is scaled by elapsed time, not frame count - per-frame, a
slow device crawled through the last few percent for seconds.

On a fast load the loader is gone about 6s after the page opens
(`MIN_VISIBLE`, the bar's last ease and the 0.9s exit). The catalog itself
is ready in ~1s on Wi-Fi and fast 4G and ~2.5s on slow 4G (throttled, phone
viewport), so the five seconds, not the download, decide it.


`?cloudtest`: ten copies of Rock Print, as a load test
------------------------------------------------------

`?cloudtest` fills every slot with a copy of the first project
(`catalogProjects`), each fetching its files with its own `?copy=n`, so the
browser downloads them as ten different projects would. The point clouds
load only on click, as for a real project.

The first version loaded all ten clouds at start-up. That was measured and
dropped - this is why clouds are load-on-click:

| Connection        | Normal: models done | Normal: total | Ten clouds at start-up | total   |
|-------------------|--------------------:|--------------:|-----------------------:|--------:|
| Wi-Fi, 30 Mbps    |               0.8s  |       0.48 MB |                   3.2s | 9.66 MB |
| Fast 4G, 9 Mbps   |               1.0s  |       0.48 MB |                   9.2s | 9.66 MB |
| Slow 4G, 1.6 Mbps |               2.5s  |       0.48 MB |                  49.2s | 9.66 MB |

(Phone viewport, cache disabled, gzipped as GitHub Pages serves.) With ten
rocks and clouds on click: thumbnails done at 1.2s / 2.0s / 8.6s, ~2 MB.
Ten light thumbnails is a reasonable cost; ten full clouds (944 KB each)
was not.

Remove the flag once there are real projects to fill the grid.


Tried and removed
=================

Kept so they aren't re-proposed blind. All were built, shipped or
previewed, and taken out at the user's request.

- **"Explore me..." tag on the spotlit cube**, in orange. Replaced by
  project labels near the pointer, which were then removed too. (The
  spotlit cube now carries its "Project XX" name again, blinking - asked
  for after all three below had gone.)
- **"Project 01".."Project 10" label** on the cube nearest the pointer,
  faded by distance (`PROJECT_TAG_NEAR`/`FAR`). Replaced by falling names.
- **Project names falling like leaves**: a cube's name dropped as plain ink
  text when the pointer reached it, swaying down off the screen (CSS
  `leaf-fall`, per-leaf custom properties, a per-cube cooldown). Removed;
  names near the pointer haven't come back.
- **Send-off variants**: blowing the cubes outward and up over 2s; a hard
  0.55s shake and fast fall; a "flux" that swirled and rocked each cube;
  a push-and-hop wave; a tumbling fall with sideways drift; waiting for the
  last cube to clear before the camera moved. Disliked in turn - spin,
  shaking, drift and the pause all read as clumsy. Current: instant boom,
  hang, slow straight fall, camera moving in during it.
- **Dark site with a cyan palette**, a `Sky` dome behind it. Replaced by
  paper.
- **Bridging a paper loader into the dark site**: a plain fade (too
  sudden), then a pool of dark ink spreading from the centre (disliked).
  Resolved by making the whole site paper.
- **Loader palettes** tide (cyan), ember (orange), current (cyan to
  orange), aurora (green to violet) and magma (red to magenta), compared
  behind a `?loaderpreview` mode that has since been removed.
- **A single dark-teal ink** for the points, before the three inks.
- **Orbiting the catalog** (OrbitControls in the grid view).
- **A hand icon for the tap hint** (Lucide's "pointer"), three other redrawn
  designs, and the fingertip as a soft glow in orange, then blue, then dark
  grey, before it became white with a black outline. Also: the hint stopping
  for good once the visitor had zoomed, and skipping while zoomed in.
- **A white chip behind the orange cube's "Project XX"** - now bare text.
- **The close-up beside the drawer on a wide screen**: it cut the pavilion
  off under the drawer; the whole model now moves left instead. (Phones
  keep the close-up.)
- **Rock Print's first landing view**, `{ elevation: 49, turn: 145 }`,
  fitted to an earlier screenshot - replaced by the closer, steeper one.
- **A 1.6s minimum for the loader** - asked to be at least 5s.
- **An orthographic detail view** (`DETAIL_PROJECTION`, still switchable)
  and an oblique three-quarter default: flat, and nothing square.
- **`controls.autoRotate`** in the detail view: turned the cube's edges.
- **A hover pulse in the catalog**: the hovered cube held at its slot with
  a fast jitter and a ±20% size pulse (its rock pulsing too). Now it just
  keeps floating, tinted.
