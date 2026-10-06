Decisions
=========

Why a few things are the way they are, where the code alone would not say.
Each entry names what was chosen, what it was chosen over, and what would
have to change to revisit it.


The catalog has a fixed number of slots
---------------------------------------

`SLOT_COUNT = 10` decides how many cubes exist; the viewport only decides how
they are arranged. `computeGridShape` picks the column count whose proportions
sit closest to the viewport's, and `fitCameraToGrid` frames the result.

It used to work the other way round: the grid was sized from the viewport
aspect ratio, so the number of cubes was decided by how wide the browser
window happened to be. That gave 0 cubes below aspect 0.5 (portrait phones
rendered nothing at all), 6 at 1280x720 and 8 on an ultrawide. With projects
living in slots, that would have meant projects becoming unreachable on
narrow screens.

A project's `slot` is therefore stable across reloads and resizes. The
arrangement is not - a slot sits in a different place on a phone than on a
desktop - but the ordering is row-major and constant, so "the first one" is
always the first one.


The detail camera looks along the catalog's screen-up, and every camera move slerps
-----------------------------------------------------------------------------------

Opening and closing a project both rolled the whole grid 90°. The cause was
the two views disagreeing about which world direction is "sideways". The
catalog camera looks straight down with world +X to its right and world -Z
up the screen. The detail camera used to look along +X, which put world +Z
to its right. Any move between those two orientations has to roll 90°
somewhere, whatever the easing or interpolation.

Where the roll landed depended on how orientation was computed:

- Opening, with OrbitControls re-deriving orientation from position every
  frame, snapped the heading in the first frame. The catalog camera sits
  exactly overhead, the pole of OrbitControls' spherical maths, where the
  heading is undefined, and the first non-zero offset picked it. A slerp
  was added for opening, which turned the snap into a combined
  tilt-and-roll that still turned the grid.
- Closing kept the detail view's heading all the way down, so the grid
  arrived sideways. Then, the instant the camera reached the exact
  overhead point, OrbitControls re-read the heading as 0 and rolled 90° in
  a single frame. An earlier version of this entry said closing "was never
  broken", based on logs that actually showed this. The camera reached
  `(-0.5,-0.5,-0.5,0.5)` (looking down, rolled) and the next frame read
  `(-0.707,0,0,0.707)` (looking down, upright). That is the same view
  direction, 90° apart in roll, and it was misread as a smooth ease.

The fix removes the roll at its source. The detail camera's default
heading (azimuth 0 in `viewDirection`) puts it on +Z looking along -Z, the
catalog's own screen-up, so world +X is screen-right in both views.
Every transition (catalog to detail, detail to the drawer close-up and
back, detail to catalog) is a pure tilt about world X for a project on
the default view. A project's own `view.azimuth` adds exactly that much
turn on top, 4° for Rock Print (see "A project can set its own camera
angle" below). The model was authored to be seen from -X, so
`DETAIL_MODEL_YAW` turns it a quarter, showing exactly the same face and
framing as before. Screenshots of the old and new detail views match.

Orientation is also no longer left to OrbitControls during any animated
move. `moveCamera` tweens position and target as before, and separately
slerps the quaternion from where it is to exactly where `Matrix4.lookAt`
would leave it at the destination. `cameraOrientationLocked` keeps the
render loop's `controls.update()` from fighting it until it lands. This is
what keeps a close that starts from a user-orbited detail view from
snapping at the pole: the end orientation is stated, not inferred. All
three animated moves (`frameDetail`, `frameDetailCloseup`,
`fitCameraToGrid({ animate: true })`) go through it.

`moveCamera` cancels any move still in flight first, and `animateFov` does
the same for the lens. Without that, opening (1.6s) outlasted a close
started 300ms in (1.1s), and dragged the camera and lens back towards the
detail view after the close had finished. That was the "camera stuck at
the wrong position" behaviour noted earlier.

How it was verified: a pure tilt about X means the quaternion's Y and Z
components stay exactly 0. Logging them every frame through
open / drawer open / drawer close / back, twice each on desktop and
mobile, gives a maximum of 0.0000 on the fixed build. The same probe on
the previously live build caught a 90.00° rotation in a single frame on
every close, on both layouts. Large per-frame steps that remain are the
software renderer running at about 12fps in the middle of the ease, and
their rate matches the easing curve, with nothing at the end.

To revisit: if the catalog grid's axes ever change, `viewDirection`'s
azimuth 0 has to follow the catalog's screen-up, or the roll comes back. A
project's own `view.azimuth` turns the grid by exactly that much on the way
in and out (see "A project can set its own camera angle" below), so it
should stay small.


The detail view is a one-point perspective, square-on, by default
-----------------------------------------------------------------

This is the view for a project that doesn't set its own `view` (Rock Print
now does - see "A project can set its own camera angle" below). The camera
sits on the Z axis looking straight at the cube, so its vertical
and horizontal edges stay parallel to the canvas and depth converges on a
single central vanishing point. The earlier oblique three-quarter view made
edges converge in two directions at once and nothing read as square.

`DETAIL_PROJECTION` switches the whole view to an orthographic camera, where
nothing converges at all. That was tried and rejected: it reads flat, and the
pillars lose their roundness.

`DETAIL_FOV` is per layout - 45 degrees side-by-side, 30 stacked. A phone's
frame is narrow enough that 45 shows the cube's top and bottom faces receding
at once, as two symmetrical trapezoids around the model, which reads as a
tunnel rather than as a box.

`controls.autoRotate` is off in this view and stays off: it orbits the
CAMERA around the target, which turns the cube's own edges off-axis - the
one thing this view exists to keep square. The model now does slowly
rotate on its own (see "The model rotates slowly once a project is open",
below), but that turns the model only, parented inside a cube whose edges
stay exactly where the fit put them. The two are not the same lever, and
only one of them was ever the problem.

Square-on and full-fit is the default, not an absolute - see "The drawer
pulls the camera into a close-up, not just out of the way" and "A project
can set its own camera angle" below for the deliberate exceptions.


A project can set its own camera angle
--------------------------------------

(Rock Print's view has since been re-fitted, closer and steeper, with
`zoom` and `lift` added - see "Rock Print lands on a closer, steeper
view". The mechanism below is unchanged.)

Rock Print now opens on an elevated three-quarter view rather than
square-on - a choice made from a screenshot of the shot wanted, not a
drift back to the oblique view rejected above. A project entry's `view`
holds it, in degrees: `elevation` above the horizon, `azimuth` around the
model, and `turn`, how far the model is spun round when it appears before
its slow rotation carries on. Rock Print's `{ elevation: 49, azimuth: 4,
turn: 145 }` weren't eyeballed. Elevation and azimuth came from fitting a
camera to the cube's seven visible corners in the screenshot: under 2px
error per corner, and only at 30°, the phone's actual stacked lens, which
cross-checks the fit. Turn came from rendering the model at 30° and then
5° steps against the screenshot and picking the match.

Framing a project with its own view differs from the default in three
ways, all in `frameDetail` behind `framesCube`:

- It fits the cube, not the model's bounding box. Seen from above at an
  angle, the box around the model's scattered ground points balloons and
  changes size as the model turns, which made the shot land a fifth
  smaller than intended. The cube is the frame the shot is composed
  around; stray points running off the screen edges read fine, as they do
  in the screenshot.
- Its margin is `VIEW_FRAME_MARGIN` (1.16), not `DETAIL_MARGIN`.
  `DETAIL_MARGIN`'s stacked crop-in was tuned against the whole-model box
  and puts the cube too close. 1.16 lands the camera 25.61 units from the
  cube on the screenshot's phone viewport (411x761); the fit says 25.6.
- On a phone with the drawer parked, it sits centred on the whole screen
  when the cube's top already clears the title bar there, and only drops
  as far as it has to otherwise. The default centres in the space below
  the bar, which left the model about 10% of the screen lower than the
  screenshot. The top is checked by projecting the cube's eight corners,
  not estimated. The first, conservative estimate still dropped it 35px.

Result, measured at the screenshot's viewport: the cube's corners land
12px from where they are in the screenshot on average (about 1% of the
screen width), the same on repeated runs. Transitions stay clean. The only
off-tilt component left is the intentional 4° azimuth (quaternion Y/Z
peaking at 0.032-0.033), with no snaps on either layout.

The drawer close-up keeps the project's azimuth but not its elevation: it
stays at `CLOSEUP_ELEVATION` (38°). Using the steeper 49° there left only
fragments of two pillars in the strip a phone has above the open drawer.

To revisit: a project's `turn` is relative to `DETAIL_MODEL_YAW`, so if
that ever changes, every `turn` shifts with it. And the margin and the
corner fit are both specific to the one screenshot; a project with a very
different shape might want its own margin rather than reusing 1.16.


The drawer pulls the camera into a close-up, not just out of the way
-----------------------------------------------------------------------

Opening the About drawer used to just re-run the normal full-fit
`frameDetail`, shifted over to leave room for the panel - the model
stayed whole and square-on, only smaller. Reading the description isn't
the moment to show the whole piece off, though, so `setDrawer` now calls
a dedicated `frameDetailCloseup` instead while the drawer is open: a
closer, elevated crop that deliberately abandons both halves of "one-point
perspective, square-on" - framed from above at a fixed elevation
(`CLOSEUP_ELEVATION`, 38°) on the project's own heading, and close enough
(`CLOSEUP_DISTANCE_FACTOR` of the model's own radius) that most projects
won't fit the whole piece in frame. That's the brief, not a bug: an
atmospheric detail shot to sit behind the text, not the reference view of
the piece. Closing the drawer calls the normal `frameDetail` and returns
to the project's normal view: square-on and full-fit by default, or its
own `view` (Rock Print's elevated three-quarter shot).

This goes through `moveCamera` like every other camera move. The detail
view and the close-up share the project's heading and differ only in
elevation, so moving between them is a pure tilt with no roll, the same as
opening and closing. Confirmed with the same frame-by-frame quaternion
check, in both directions.

The elevation and distance are flat constants, not computed per project -
the one existing project's pillars happen to suit a 38°/~1.1x-radius crop
well, verified by eye in a real browser on both layouts. A future project
with a very different silhouette (something tall and thin, say, rather
than wide and low) might need its own values; nothing here derives them
from the model's shape automatically.


The model rotates slowly once a project is open
-------------------------------------------------

A plain static model read as inert, so it now turns slowly around its own
Y axis while a project is open - a full turn every 40s (`DETAIL_ROTATE_SPEED`),
slow enough to read as ambient rather than as something to actively watch,
in the same spirit as the catalog's own wander.

This is not the auto-rotation that was removed earlier (see "The detail
view is a one-point perspective", above): that orbited the camera around
the cube via `controls.autoRotate`, which turned the cube's own edges away
from square to the canvas - exactly what this view exists to prevent. This
instead rotates `cube.userData.detail` (the point cloud), a child of the
cube, directly - the camera and the cube's edges never move, only the
content inside does. The two looked like the same feature from the
outside but are different levers entirely; one of them was the actual
problem and the other was always fine.

Computed as `modelStartYaw(project) + (elapsedTime - detailRotateStartTime)
* DETAIL_ROTATE_SPEED`, not accumulated per frame, matching the rest of the
project's animation - see "A cube's visual state is a pure function of its
mode", below. `modelStartYaw` is `DETAIL_MODEL_YAW`, the fixed quarter turn
that shows the camera on +Z the face the model was authored to show from
-X (see the first camera entry above), plus the project's own `view.turn`
(145° for Rock Print). `detailRotateStartTime` is reset at the moment the model
becomes visible (both the already-loaded path and the
just-finished-downloading path in `openProject`), with rotation set back
to that base yaw at the same moment, so the model always appears showing
the same face - the same reason `openProject` zeroes the cube's own
rotation and scale on click.

`frameDetail`'s fit is computed once, from the model's bounding box at
that same starting instant, and is not recomputed as the model turns - a
rotating box's on-screen footprint does change shape as it turns (a
structure that is wide and shallow presents narrower but deeper at 90°).
Checked by sampling the actual asset across a full turn in a real browser,
both layouts, parked and open drawer on mobile: the structure stays well
inside the frame at every angle tested, including the narrowest profile at
90°, so the existing margins already have enough air and no fit change was
needed. This would need revisiting for a future project whose footprint is
closer to the frame's edges than this one's.


Fitting has to allow for depth, and for what else is on screen
--------------------------------------------------------------

Under perspective the face nearest the camera projects larger than the centre
of the box, so a fit computed at the centre plane lets the model overflow the
frame. `frameDetail` adds the box's extent along the view axis for this.

The free area is computed per axis rather than per layout, because two things
can claim the same axis: the drawer takes width side-by-side and height
stacked, and the project bar takes height off the top. Stacked layouts reserve
the bar's measured height so the model frames below it rather than behind it;
side-by-side layouts reserve nothing, because the bar sits in the top-left
corner clear of a model framed into the other half.

`DETAIL_MARGIN` applies to the default square-on view only. A project
with its own `view` is framed on the cube with `VIEW_FRAME_MARGIN` and its
own vertical placement instead (see "A project can set its own camera
angle"). For the default: `DETAIL_MARGIN` is above 1 where the whole box
should fit with air around it and below 1 where the view should crop into
it. Phones crop when the drawer is
parked: the frame there is far taller than the pavilion is deep, the fit is
limited by width, and fitting the whole box leaves the model marooned in a
thin band. Once the drawer is out, height becomes the limit instead and the
same crop would take the top off the cube, so the margin eases back past 1.

Reserving vertical space was tried as a way to make the model bigger on
phones and cannot work: with a width-limited fit it moves the model up without
changing its size at all.


The fog is off
--------------

It was `Fog('#04343f', 15, 8)` - near beyond far, which inverts it. Everything
NEARER than 15 units renders fully fogged and everything beyond it renders
clean.

The catalog never showed this, because its cubes sit around 29 units out. The
detail view brings the camera within about 10 units, so the whole cube fogged
to a colour indistinguishable from the background and its frame disappeared
entirely.

Re-adding fog for the "magic/mystery" idea in the README means near < far and
a range that suits both the catalog (~29 units) and a project (~10-30 units
depending on layout and drawer state).


Faded cube faces must not write depth
-------------------------------------

In the detail view the cube's faces animate to opacity 0 but, left alone, keep
writing to the depth buffer - so the invisible front face occludes the cube's
own back edges. Dead-on that leaves a flat rectangle with no recession, which
defeats the point of the perspective. `depthWrite` is therefore false while a
project is open and restored when it closes, since the catalog gets its
solidity from it.


The point cloud is quantized, not Draco-compressed
--------------------------------------------------

`RockPrintStructureReduced.glb` declared `KHR_draco_mesh_compression` in both
`extensionsUsed` and `extensionsRequired`, but no primitive carried the
extension: it was 78,637 points of raw float32, 28 bytes each - 2,201,836
bytes of buffer in a 2,202,848-byte file. The declaration still cost every
visitor a 336 KB decoder download on first click (draco_wasm_wrapper.js plus
draco_decoder.wasm), for a decoder that then decoded nothing.

Draco does not apply here. `KHR_draco_mesh_compression` covers indexed
triangle primitives, and this is a non-indexed POINTS primitive, so the
encoder skips it. The gain came from `KHR_mesh_quantization` instead -
POSITION as normalised int16, COLOR_0 as normalised uint8, 28 bytes per point
down to 10. 2.2 MB -> 922 KB, with the render unchanged at 14 bits of position
precision (about a millimetre at this scale).

COLOR_0 is kept although no shader reads it, because colouring the point
clouds is on the README's list. Dropping it would save a further ~315 KB.

`static/draco/` still holds the decoder and its wasm fallback for any future
model that genuinely uses Draco. The encoders and the duplicate `gltf/` tree
were removed - encoders are only needed to write Draco files.


Point size is computed on the JS side
-------------------------------------

The vertex shader used to divide point size by view depth with a hand-tuned
constant, which only makes sense under perspective. `uPointScale` now carries
pixels-per-world-unit from JS and `uSizeAttenuation` decides whether depth
divides it, so a point keeps the same world size under either projection and
across pixel ratios.


A project with no description has no drawer
-------------------------------------------

`hasDescription` gates the drawer's handle. An unwritten project shows its
title beside its model and nothing else, rather than offering a handle onto an
empty panel.

The cost is that the drawer is invisible on the live site until at least one
of `year`, `role`, `context`, `body` or `credits` is filled in, which reads as
a missing feature rather than as a deliberate blank. Filling any single field
brings the handle back.

Placeholder copy was deliberately removed rather than published: a portfolio
page reading "Your role on the project" looks broken, and the role in
particular should not be stated until it can be stated accurately.


Asset paths resolve against the Vite base URL
---------------------------------------------

Paths in the `projects` array and `setDecoderPath` are stored without a
leading slash and go through `assetUrl`. Vite's `base` rewrites index.html and
bundle imports but not string literals handed to a loader at runtime, so
absolute paths would 404 under a sub-path deployment while the page itself
loaded fine. The built site is verified to work both at a domain root and
under a sub-path, so moving to a custom domain needs no code change.


Clicks are distinguished from drags
-----------------------------------

Orbiting the catalog ended in a click event, which opened whichever cube the
pointer happened to come to rest on. A press that travels more than 5px is
treated as a drag. The catalog no longer orbits at all (see "Moving the
pointer through the grid stirs it"), but the rule stays: a drag across the
grid now stirs the cubes, and letting go after it shouldn't open one.


The bar's title moves into the drawer on a narrow viewport
----------------------------------------------------------

On a small phone the bar's title and the open drawer were both claiming
height off the same budget: the bar reserved space for a two-line title,
the drawer then took 58% of what was left, and the model that had to fit
in between shrank to a postage stamp.

Shrinking the drawer was the other option and was rejected: it buys back
some room everywhere, including in states that were not cramped to begin
with, and it still leaves the duplication - the title visible in the bar
at the same time the drawer's own content, which starts with year/role/
context, has nowhere to say what project it belongs to.

Instead the drawer's own header carries the title once it is open on a
narrow viewport, and the bar's copy hides for exactly that state via a
`body.drawer-open` class toggled in `setDrawer()`, scoped by the existing
859px media query so side-by-side layouts are untouched. `barFraction()`
already measures `bar.offsetHeight` live from the DOM, so the smaller bar
is picked up on the next reframe with no change needed there - the fix is
almost entirely a CSS/markup one, not a camera one.

The switch was originally instant (a plain `display: none`), not animated.
Opening read fine that way - the bar's title vanishes the instant the
drawer starts sliding out, absorbed into it rather than missing. Closing
a project while the drawer was open did not: `drawer-open` comes off
`body` the moment `closeProject` runs, so the bar's title switches back to
`display: block` and is fully visible again instantly - while the
drawer's own title is still sliding away, fading out over its own slower
transition. For a brief window both titles rendered at once, stacked on
top of each other. `.bar__title` now crossfades (`opacity`/`visibility`,
not `display`) on the same 0.3s timing as the drawer content's own fade,
so the two dissolve into each other instead of overlapping as two solid
pieces of text. Caught by screenshotting the first few frames after
closing a project with the drawer open, on a real browser, since neither
the catalog-camera telemetry nor a parked-drawer close ever exercises this
path.

The bar's title is one line at every width. It used to wrap onto two: the
bar was capped at `min(26rem, 60vw)`, which on a phone left "Rock Print
Pavilion" no room past "Rock Print", and on desktops from about 1280px
wide the title's font grows faster than 26rem allows. `.bar__title` is now
`white-space: nowrap`, with the bar only capped at the screen's width. A
future title too long for a narrow phone ellipsises rather than wrapping.
Measured from 320px to 1920px wide: one line everywhere, nothing clipped,
and even at 320px the title ends at 254px. The shorter bar is picked up by
`barFraction()` on the next frame, which only gives the model more room
below it.

A cube's visual state is a pure function of its mode, not an animation to start and stop
----------------------------------------------------------------------------------------

The catalog originally drove motion two ways: a per-cube linear Y-bounce
inside the main render loop, and - only while hovered - a second,
independent `requestAnimationFrame` loop that nudged position, scale and
colour on top of it. Adding ambient wander and an occasional spotlight
without a cleaner model would have meant a third loop, all three racing to
write the same `position` fields on whichever cube any two of them agreed
to touch at once.

Instead a cube's entire visual state - position, rotation, scale, colour,
opacity, its thumbnail's scale - is computed fresh every frame from two
things only: which of `idle` / `hovered` / `spotlighted` it currently is,
and the clock. Two grid-wide modes were added later on the same terms:
`'dropping'` (the send-off after a click, `updateDroppingCube`) and
`'returning'` (the way back, `placeAtRest`) - see "Clicking a project
knocks the rest of the grid off the screen first". Nothing is ever incremented or accumulated, so nothing can
drift, and nothing needs an explicit reset when a mode ends: the next frame
simply computes a different mode's state instead. (One deliberate
exception sits on top of this: the pointer's flow, a spring with memory,
added after each mode's state and zeroed on leaving the catalog - see
"Moving the pointer through the grid stirs it".) `updateCube()` picks the
mode, and `updateIdleCube()` / `updateHoveredCube()` / `updateSpotlightCube()`
each define a complete state, not a diff against whatever was there before.

This is also what caught two bugs that had been live since before this
session, both in the old hover-only loop: un-hovering a cube reset its
edges to grey rather than back to the resting cyan every other code path
used (`closeProject` already used cyan; nothing had ever matched hover's
reset to it), so a cube's edges dimmed permanently the first time anyone
hovered it and stayed that way until an unrelated project open/close reset
every cube at once. And the thumbnail's hover pulse set its scale to
roughly 1.0 (meant to read as "±10% around resting size") while its actual
resting scale was 0.2, then settled at 0.15 afterwards instead of back to
0.2 - a visible jump to ~5x size on hover, then permanently 25% smaller
than original once the cursor moved away. Both are gone by construction:
every pulse is now computed as a multiple of a stored base value
(`contentBaseScale`), and idle state always writes the resting colour
outright rather than relying on some other code path to have already set it.

Clicking a project now runs a send-off first (see "Clicking a project
knocks the rest of the grid off the screen first" below), so this
paragraph's "holds wherever it was" applies from the end of that, not from
the click.

The catalog's whole per-cube update, including the ambient wander, only
runs while `viewState === 'catalog'`. A cube simply holds wherever it was
the instant a project opens - `openProject`'s own fade covers for it - and
the spotlight's dwell/gap timers are plain comparisons against the clock,
so they self-correct however long detail view was open for without
needing to be paused or reset on the way in or out. The one thing that does
need an explicit reset is the clicked cube's own rotation: it parents the
detail model, and the one-point elevation depends on its edges staying
perfectly square to the canvas, so a residual spotlight-rock tilt would
otherwise carry straight into it. `openProject` zeroes it explicitly for
exactly this reason - verified by forcing a click while a cube was
mid-rotation in a real browser, both before and after that line existed.

The same "only runs while catalog" rule has a sharp edge on the way out
that the paragraph above doesn't mention: closing a project used to flip
`viewState` back to `'catalog'` immediately, in the same tick as
`closeProject`'s own one-off tweens were created. That resumes
`updateIdleCube()` on the very next frame - and because it writes a
complete, unconditional state every frame rather than a diff, its
`opacity = 1` assignment runs again on every subsequent frame too,
stomping the closing opacity tween's eased value right back to 1 before
it could ever render. The tween wasn't broken; it was just never allowed
to finish a single frame before being overwritten, for the entire rest of
the catalog's uncountable remaining frames. The result: the grid's faces
and edges snapped to full opacity in a single frame regardless of the
tween's nominal duration, while the camera - genuinely mid-tween, since
nothing else touches camera position every frame - was still parked close
against the clicked cube's own geometry. Seen together, a sudden wall of
opaque, depth-writing faces at point-blank range: large, skewed,
overlapping quads, for a few frames before the camera cleared it.
Confirmed by logging the cube's own opacity value frame by frame after
closing in a real browser: it read 1 within about one frame regardless of
what duration or delay the tween was given.

Fixed by not flipping `viewState` back to `'catalog'` until the reveal's
own tweens finish (`gsap.delayedCall`, timed to the tween's delay plus
duration). It was held at `'detail'` for that window at first, and is now
`'returning'`, which also places the cubes back home each frame without
touching opacity (added with the drop - see "Clicking a project knocks the
rest of the grid off the screen first"). `selectedCube` is still cleared immediately, so nothing
reopens mid-fade, but the catalog's per-frame loop stays out of the
picture until the tweens it would otherwise fight are done. The same
window also holds back `other.material.depthWrite = true` behind a short
delay and eases the opacity tweens in rather than out (`power2.inOut`
instead of `power2.out`), so the reveal itself doesn't start until the
camera has had a moment to begin pulling back, matching the shape of the
camera's own tween rather than front-loading visibility before it. Any
plain, unconditional per-frame write like `updateIdleCube()`'s competing
with a one-off tween on the same property is the same shape of bug; this
is the only place in the catalog where that currently happens, since
every other per-frame catalog write only runs while a cube is actually in
catalog mode and nothing else tweens those same properties concurrently.


Why the spotlight holds still rather than wandering

A spotlighted cube is deliberately held at its exact slot position - no
ambient wander - while it jumps. Letting it also drift would mean two
independent motions on the same cube at once (a slow wander plus a faster
jump), which read as busy rather than as "look at this one." Holding still
while everything else keeps drifting is itself part of the signal.


The invitation is one orange: the spotlit cube, its tag and the drawer handle

The pulsing cube, its "Explore me..." tag and the drawer's About handle
all use one orange, `#ff8c32` (`--warm` in styles.css, with `--warm-rgb`,
`--warm-deep` and `--warm-deep-rgb` for the translucent and dark variants;
`spotlightGlowColor` in script.js is kept in step by hand). One colour for
"click me" across the catalog and the detail view, as asked. (The tag has
since been removed - see "The cubes are labelled near the pointer" - and
the "Project XX" label that replaced it is teal; the pulsing cube and the
handle are still the orange.)

History: the spotlight first blinked to the drawer's dark red `#c42941`
for exactly this reason, then to a lighter `#ff5c5c` of its own for a
brighter flash, and then everything moved to orange together.

Getting the cube to actually look that orange took two things the code
alone doesn't explain:

- `spotlightGlowColor` is set from raw values
  (`setRGB(..., LinearSRGBColorSpace)`), not a hex string. The renderer
  outputs linear values straight to the screen (`outputColorSpace =
  LinearSRGBColorSpace`), and a hex string is converted towards linear on
  the way in - twice, as the colours here then were, with
  `convertSRGBToLinear()` on top. That had been harmless for the cyans the
  dark scene was tuned by eye in, but it
  crushed this orange's green channel and rendered a brick red. Raw, the
  edges show `#ff8c32` exactly. Since the move to paper every scene colour
  is given this way, through `screenColor()`.
- The face glows through its emissive colour, not its base colour. The
  faces are lit by the scene's cyan lights (`#86cdff`), so an orange base
  colour came out green; emissive isn't lit. The base colour is dimmed as
  the glow rises (`SPOTLIGHT_FACE_DIM`), or the cyan-lit grey under it
  washes the orange out to tan. `SPOTLIGHT_FACE_GLOW` sets the strength.
  Every place that resets a cube's face colour also resets its emissive
  to black.

The blink was edges-only at first; the face now glows the same way, on
the same `glow * intensity` fraction, so the cube reads as lit up inside
rather than only outlined. This exposed a gap
`openProject` already had a fix for on the rotation and scale fronts but
not this one: the clicked cube's face fades out over 0.8s rather than
vanishing instantly, so a residual glow colour would show through as a
brief orange tint during that fade if nothing reset it. `openProject` now
resets face colour and emissive alongside edge colour, rotation and scale - the same
shape of fix, found the same way (forcing the click to land mid-effect in
a real browser) for the same underlying reason: anything the jump can
change on the clicked cube has to be reset there, because the detail view
inherits whatever the click catches it holding.


Why every cube is eligible now, not only ones holding a project

Originally only project-holding cubes could be spotlighted, on the
reasoning that spotlighting an empty slot would invite a click that does
nothing. That reasoning held while the spotlight was a rare, occasional
nudge towards clicking a specific project. It stopped holding once the
brief changed to a continuous, grid-wide cycle, one cube every ~5.3-5.6
seconds, with every cube getting a turn: at that cadence the spotlight
reads as the grid's own ambient behaviour - closer to the wander than to a
call to action - and restricting it to the one or two cubes that happen to
hold a project would make most of a ten-slot grid look inert. An empty
slot jumping invites nothing and costs nothing either.

The hovered cube stays excluded regardless: spotlighting it would fight
hover for the same fields (colour, opacity, scale) on the same frame. The
cube that just finished is also excluded from the very next pick, so it
visibly moves on around the grid rather than occasionally repeating itself
back to back - still possible later in the cycle, just not immediately.


Clicking a project knocks the rest of the grid off the screen first
--------------------------------------------------------------------

A click no longer opens the project straight away. First comes a boom:
one shockwave out from the clicked cube knocks every other cube outward
(`BOOM_PUSH`) and up towards the camera (`BOOM_LIFT`, which reads as a
jolt since the cube grows as it rises). The knock settles exponentially
(`BOOM_SNAP`, 0.07s), so it's all but done in 0.2s and then dead still -
no bounce. The wave reaches further cubes a few hundredths of a second
later (`BOOM_WAVE`, 0.006s per unit). They hang there until `BOOM_HANG`
(0.3s), then fall slowly down the screen, off the bottom edge
(`DROP_FALL`, 1.4s, staggered by up to `DROP_STAGGER`, 0.2s). The lift
gives way as they fall. The clicked cube holds still where it was.
`openProject` runs `DROP_OPEN_AFTER` (0.65s) into the fall, so the camera
is already moving in while the others are still on screen.

Nothing oscillates and nothing rotates: one knock, a hang, a straight
fall. That's on purpose - see History below.

"Down" here means down the screen. The catalog camera looks straight down
at the grid, so world-down would only shrink the cubes into the distance;
down the screen is world +Z. They also sink a little away from the camera
(`DROP_SINK`), which keeps a falling cube passing behind the chosen one
rather than over it. The fall is quadratic in time, like gravity: slow
at first, which is the part seen before the camera moves in.

History: the first version blew the cubes outward and up towards the
viewer over two seconds; it was asked to fall instead, and be faster, which
gave a hard 0.55s shake and a 0.45s fall. That was then asked to flow -
"juggle in a flux" - and to fall slowly. The first flux swirled each cube
in a circle and rocked it for a second; the spin was disliked, so it
became a push and hop on a rippling wave, with no rotation. The fall's
tumble and sideways drift were then taken out too. Even without
rotation, a second of wave still read as a lot of shaking before the
fall; what was wanted was "an instant boom and then slow fall", which is
the current version. The flux version also waited for the last cube to
clear the screen before the camera moved, which read as a clumsy pause -
see below.

It's built as another mode in the same pure-function scheme as idle, hover
and spotlight ("A cube's visual state is a pure function of its mode"
above), not as gsap tweens on each cube. `viewState` is `'dropping'` for
the send-off, and `updateDroppingCube` computes each cube's whole pose from
time since the click plus a shockwave lag, a direction out from the
chosen cube and a stagger, all fixed at the click. Tweens would have had to fight the per-frame pose writes, the
same shape of bug the closing fade had.

The camera moves in while the cubes are still falling, rather than after.
Waiting for the last one to clear left a beat with only the chosen cube on
screen, and then the camera eased in from a standstill - a pause, twice
over. So the fall keeps playing out after `openProject`: in detail view
`animate()` keeps calling `placeDroppingCube` (pose only) on the other
cubes until `dropInProgress` says the last one has finished, while
`openProject`'s own fade takes their faces and edges out. The pose and the
material are split for this - `updateDroppingCube` also resets colour and
opacity each frame, which would fight that fade.

The camera's move in uses `OPEN_CAMERA_EASE` (`power2.out`) instead of
`moveCamera`'s usual `power2.inOut`: the falling cubes already carry the
motion, so the camera sets off at speed and settles. Every other camera
move keeps the ease-in. On a first visit the model is still downloading
when the move starts, and the re-frame once it lands used to restart the
move from rest with the default ease - a visible stall halfway in. When
the model lands during the move, the re-frame now finishes within the
time the move had left, with the same ease-out.

The drop leaves cubes far down the screen and hidden behind
`openProject`'s fade. Closing therefore needs its own mode: `viewState` is
`'returning'` from the close until the grid has faded back in. It places
every cube at its resting pose each frame (`placeAtRest`, the part of
idle that doesn't touch opacity), so the grid fades in already home. It
doesn't snap there when the catalog resumes, and doesn't fight the reveal's
opacity tween. Click, hover, Escape and resize already only act in
`'catalog'` or `'detail'`, so all of them correctly ignore both new modes. A
second click or Escape during the drop does nothing.

Verified in a real browser on both layouts, on a simulated clock so the
frames land at exact times despite software rendering: the boom has
landed by 0.12s, the cubes hang square until 0.3s, fall in view until the
zoom starts at 0.95s with cubes still on screen, and the camera has
settled by about 1.6-2s. Going back mid-fall returns every cube home, and
a second open, with the model cached, takes the same path. Checked in
earlier versions of the send-off, through a debug hook since removed: the
state runs dropping > detail > returning > catalog, the camera's only
turn is the intentional 4° azimuth, and after a round trip every cube is
back within its normal wander, fully opaque.

To revisit: the timings, distances and amplitudes are named constants next
to `startDrop`.


The "Explore me..." tag is HTML laid over the canvas, not part of the scene
----------------------------------------------------------------------------

(Since removed, and replaced by the "Project 01"... label - see "The cubes
are labelled near the pointer". The HTML-over-canvas approach and
`placeTagOnCube` carried over unchanged.)

The tag on the pulsing cube is a plain `<div>` (`#explore-tag`) placed every
frame by `updateCubeTags` (via `placeTagOnCube`), which projects a point on the spotlit cube to
screen pixels. A sprite or text mesh in the scene was the alternative and
was passed over: HTML gets the real Fira Sans at the project title's weight
and tracking, stays sharp at any pixel ratio, and costs nothing to restyle
in CSS. Its opacity follows `spotlightIntensity`, the same ramp as the
glow, with a 0.25s CSS transition only to smooth the moments the spotlight
hands over or the cursor takes the cube. It's `pointer-events: none`, so
clicks go straight through to the cube.

It sits on the lower part of the cube's top face (`cubeSize * 0.36` towards
the bottom of the screen from its centre), not above the cube. The Rock
Print cube is in the top row, and on a tight frame there's no room above a
top-row cube. Lower than the face's centre so it clears the thumbnail model
inside. Checked on the Rock Print cube at the peak of its glow on both
layouts, and on several random spotlit cubes: always fully on screen.

The spotlight picks any cube, empty slots included (see "Why every cube is
eligible now"), and so does the tag, as asked. Clicking an empty slot
answers with the "Still empty..." tag (below) rather than restricting this
one.

`exploreTag` (later `projectTag`, then a container for falling names - all since removed) was looked up near the top of the file with the other elements,
not next to `updateCubeTags`: `animate()` runs its first frame the moment
it's defined, before anything further down has executed, and the tag
lookup has to exist by then.


Clicking an empty slot answers with "Still empty..."
----------------------------------------------------

A click on a cube with no project used to do nothing at all. It now shows a
second tag, `#empty-tag`, built the same way as "Explore me..." and pinned
to the same spot on the cube by the same `placeTagOnCube`, so the two read
as one system. Its timing is a pure function of the clock like everything
else per-frame: the click records the cube and the time, and
`updateCubeTags` holds it fully up for most of `EMPTY_TAG_DURATION` (1.6s)
and fades it over the last `EMPTY_TAG_FADE` (0.3s). Clicking again
restarts it; it's dropped as soon as the catalog isn't on screen.

It's the same chip in the cool palette (`--panel-bg`, `--rule`,
`--ink-dim`) rather than the warm orange: orange is the invitation, and an empty
slot isn't one. If the clicked cube is also the pulsing one, "Still
empty..." wins and "Explore me..." stays hidden until it's gone - one
answer to the click, not two labels stacked on the same face. In practice
a desktop click comes after a hover, which already ends the spotlight on
that cube; on a touch screen the tap is what does it. ("Explore me..."
and the project names that replaced it have since been removed; "Still
empty..." is the grid's only word now.)


The start-up loader is inline in index.html, and waits for real progress
-------------------------------------------------------------------------

The loader (`#loader`) is markup, CSS and a small classic script written
straight into index.html, ahead of everything else in `<body>`. The main
bundle is ~690 KB of JavaScript (~180 KB over the wire); a loader built
inside it couldn't appear until all of that had downloaded and run, which
on a slow connection is the first second or more - exactly when a loader
is needed. Inline, it's on screen with the first paint.

Design: "flux and flow" taken literally - a field of particles streaming
along slowly drifting, braided currents (a few layered sine waves give the
flow direction at each point), with the "Flux and Flow" wordmark and a
hairline progress bar over it. It launched in the site's cyan on its dark
background; its colours are now "paper", like the whole site - see "The
loader is "paper"". The flow gathers strength (speed and brightness) as
loading progresses; on the way out, every stream pours into the centre
while the loader fades, onto the same paper, and the grid - already drawn
underneath - is all that's left. Trails come from fading
the previous frame instead of clearing it. Under `prefers-reduced-motion`
it draws a still set of streamlines once and only the bar moves.

Progress is real, not a timer. script.js registers every asset the
catalog needs at start-up with `bootAsset()` (the noise texture and each
thumbnail file, once per file however many cubes show it), reports byte
progress where
the server gives a length, and calls `window.fluxLoader.finish()` once
`sealBoot()` has run and all of them are done - two frames later, so the
grid has been drawn behind it. A failed load counts as done, so a missing
file can't hold the page hostage, and the loader finishes on its own after
30 seconds whatever happens. It stays up at least 1.6s (`MIN_VISIBLE`), so
a fast load reads as an opening rather than a flash. Fonts aren't waited
for.

Everything in its animation is scaled by elapsed time, not frame count:
the bar's easing, the particle speed, the trail fade. The first version
was per-frame, and in a slow software renderer the bar took seconds to
crawl through its last few percent - the same would happen on a slow
phone, and frame rate shouldn't decide how long a loader takes.

Measured on a phone-sized viewport with the network throttled: on Wi-Fi
and fast 4G the loader leaves at about 2.7-2.8s, set mostly by
`MIN_VISIBLE` plus what was then a 0.9s exit; on slow 4G (1.6 Mbps) at
about 3.9s. The exit is now 2.1s (the ink, below), so add about 1.2s.


`?cloudtest`: ten copies of Rock Print, as a load test
------------------------------------------------------

Asked as a quick test of whether the page would still load reasonably
fast with more projects in it. Rather than changing the catalog for
everyone, it's behind a query string: `?cloudtest` fills every slot with
a copy of the first project (`catalogProjects`) - its little rock as the
thumbnail in every cube, loaded with the page, and its point cloud loaded
only when that cube is clicked, exactly as a real project's is. Each copy
fetches its files with its own `?copy=n`, so the browser downloads them
as it would ten different projects' - one cached file reused ten times
would have flattered the result.

The first version of the test put the full point cloud itself in every
cube at start-up. That was measured and dropped, and the numbers are why
the clouds stay load-on-click:

| Connection              | Normal: models done | Normal: total | Ten clouds at start-up: models done | total   |
|-------------------------|--------------------:|--------------:|------------------------------------:|--------:|
| Wi-Fi, 30 Mbps          |               0.8s  |       0.48 MB |                                3.2s | 9.66 MB |
| Fast 4G, 9 Mbps         |               1.0s  |       0.48 MB |                                9.2s | 9.66 MB |
| Slow 4G, 1.6 Mbps       |               2.5s  |       0.48 MB |                               49.2s | 9.66 MB |

(Phone-sized viewport, network throttled, cache disabled, text files
gzipped as GitHub Pages serves them.) The clouds are 944 KB each (78,637
points: 16-bit positions, 8-bit colours), so ten of them were about twenty
times everything else the page loads. Rendering ~790,000 points is light
for a real GPU, but couldn't be measured here - the software renderer used
for testing dropped from ~30 to ~1 frames per second.

With rocks in every cube and clouds only on click, the same
measurement gives: thumbnails done at 1.2s on Wi-Fi, 2.0s on fast 4G and
8.6s on slow 4G, about 2 MB in all - against 0.8s, 1.0s and 2.5s for the
page as it is. Each rock is a 187 KB `.gltf` with its data embedded as
base64 text (~170 KB gzipped); the same rock as a binary `.glb` would be
around a quarter smaller, which is worth doing for real thumbnails. Ten
light thumbnails is a reasonable cost; ten full clouds was not.

The flag can be removed once there are real projects to fill the grid.


Rock Print's points gather out of a scattered cloud when it opens
-----------------------------------------------------------------

Each time the project opens, its point cloud starts as a loose, scattered
cloud around the model and slowly condenses into the pavilion
(`GATHER_DURATION`, 3.6s), each point spiralling in to its own place at
its own moment. It's opt-in per project (`gather: true` in the projects
array), chosen from the three loader directions offered: "a scattered
cloud of points slowly gathers into the Rock Print shape".

It runs entirely in the point cloud's vertex shader. When a gathering
cloud loads, `addGatherAttributes` gives every point two extra
attributes: a start position somewhere in a flattened ball around the
model (`GATHER_SCATTER` times its half-width, squashed vertically so it
reads as a cloud drifting at the model's level rather than a sphere), and
a random delay. The shader eases each point from its start to its real
position as the `uGather` uniform goes 0 to 1, starting it within the
first `GATHER_SPREAD` (40%) of the gather by its delay, and turns the
start position round the vertical axis by up to `GATHER_SWIRL` as it goes
so the points spiral in like a current rather than flying straight.
Scattered points are drawn fainter (on the dark site that meant dimmer;
on paper it's lighter ink) and reach full strength as they arrive. Per
frame
it costs one uniform write - nothing moves on the CPU, which matters with
~79,000 points.

The start positions are generated in the cloud's own attribute space,
before the node's transform. That space is the quantized, normalized one
(positions are 16-bit integers the GPU reads as -1..1 - see "The point
cloud is quantized"), and three.js's bounding box is computed in it too,
so the scatter lines up with the model without converting anything.

It's driven from `detailRotateStartTime`, which is set whenever the model
is shown - on a first open when it finishes downloading, on later opens
straight away - so it replays from scattered every time, and shares a
start with the slow rotation. A cloud loaded without the attributes is
left alone: `setGather` only touches clouds that were loaded to gather,
since the shader would otherwise read a missing start position as the
origin and fly every point in from the middle.


Every cube shows the rock, from one download
--------------------------------------------

Asked for: the little rock inside every cube on the normal page, not only
in Rock Print's. Slots with no project use `EMPTY_SLOT_THUMB` (the same
rock) and still answer a click with "Still empty..." - the rock fills the
grid out visually, it doesn't make the slot a project.

`loadThumb` keeps one promise per file path, and each cube adds its own
`clone()` of the loaded scene (geometry and materials shared). Ten cubes
showing the same rock is one 187 KB download, not ten. `?cloudtest` gives
each copy its own URL, so the test still measures ten separate downloads.
A thumbnail that arrives while a project is open stays hidden, as every
other cube's does, until the project is closed.

`EMPTY_SLOT_THUMB` and the `thumbScenes` cache sit next to the projects
rather than next to `loadThumb`, because `createPlayground()` runs (and
loads the thumbnails) before that part of the file has executed - the
first version had them further down and crashed on load with a
temporal-dead-zone error.


The loader is "paper", and so is the site
-----------------------------------------

Asked to explore different colours for the loader. Six palettes were put
side by side on the live site, behind a `?loaderpreview` mode that held
the loader on screen and cycled them with a tap: tide (the cyan it
launched with), ember (the invitation orange), current (cyan turning
orange), aurora (green to violet), magma (red to magenta) and paper (dark
ink on a light ground). Paper was chosen; the others and the preview mode
were then removed.

The palette is one object in index.html: a background, two stream
colours and the wordmark's text colours. The CSS reads them through
`--loader-*` properties the script sets, falling back to the site's own
colours. Each stream is shaded between the two stream colours by the
direction it's flowing, in `SHADES` steps, drawn as one stroke per shade
rather than one per particle - in paper, that's dark teal-black ink
turning to the site's orange.

A light loader in front of the dark site made the hand-over a jump from
light to dark. A plain fade read as too sudden; a pool of dark ink
spreading from the centre until the paper was covered (2.1s) was tried
next and disliked. Of the alternatives offered - an even dusk, a
see-through crossfade, the paper draining away along the flow, the whole
site going light, or a dark loader - the site went light: see "The whole
site is paper". The loader's background is now the site's own, so its
exit is a plain 0.9s fade with the streams pouring into the centre, and
nothing needs bridging.

To change the loader's colours, edit `palette` in index.html; its `bg`
should stay equal to `--bg` in styles.css, or the jump comes back.


Moving the pointer through the grid stirs it; the grid no longer orbits
------------------------------------------------------------------------

Asked for: stop the orbit in the all-projects view, make the cubes float
more, and have them respond to the mouse.

Orbit: `controls.enabled` is false in the catalog and switched on only
while a project is open. OrbitControls' `update()` still runs every frame
either way - `enabled` only gates input - and moveCamera depends on that
to resync after its moves.

Float: the idle wander is bigger and a little quicker
(`WANDER_XZ_AMPLITUDE` 0.18 to 0.38 units, `WANDER_Y_*` up by about a
third), and each cube now rocks gently as it drifts (`WANDER_TILT`, 0.05
rad on slow periods of its own). The sideways sway stays under half the
1-unit gap between neighbours, so two cubes drifting towards each other
don't meet.

The flow: the pointer moving through the grid carries the cubes near it
along, like a hand through water, and they lean the way they're carried.
Each cube has a target offset - the pointer's recent velocity times
`FLOW_CARRY`, scaled by a Gaussian of its distance from the pointer
(`FLOW_RADIUS`) and capped at `FLOW_MAX` - and follows it on an
under-damped spring (`FLOW_STIFFNESS`, `FLOW_DAMPING`), so it overshoots a
touch and settles back once the pointer has passed. Only motion pushes: a
resting cursor exerts nothing, so the cube under it stays put to be
clicked. Pulling cubes towards the cursor, or pushing them away from it,
was passed over for exactly that reason - either moves the cube you're
aiming at. It listens to `pointermove`, so a finger dragged across the
grid on a phone stirs it too.

This is the one part of the catalog's motion that isn't a pure function
of mode and clock (see "A cube's visual state is a pure function of its
mode"): a push has to linger after the pointer moves on, so it's a spring
integrated frame by frame, in fixed small steps for stability. It's kept
contained: applied on top of whatever each mode has just set, only in
`'catalog'`, and zeroed by `resetFlow()` when the drop starts, so no stale
shove survives into the send-off or back out of a project. Its constants
and state sit above `animate()`, which runs its first frame as soon as it
is defined.

Checked on desktop: a drag across the grid moves and tilts the nearby
cubes without turning the view, they settle back within a couple of
seconds, clicking a project still opens it, and orbiting by hand inside
the project still works.


The whole site is paper
-----------------------

Asked for after the loader went "paper": rather than bridge a light
loader and a dark site, make the site light too. The palette in
styles.css is now dark ink (`--ink` #0e1d24) on a warm light ground
(`--bg` #f0ede6), with a deep teal accent (#1f5f6b) and the orange
invitation unchanged. Text on the dark orange drawer handle uses
`--on-warm`, since `--ink` is now dark (it also served the "Explore me..."
tag, since removed).

Three things in the scene had to change with it, and none of them is
obvious from the colours alone:

- **There was a sky.** The near-black background was never the page's
  `--bg`: a three.js `Sky` dome, its sun set just below the horizon,
  filled the whole view with a dark night. The renderer was already
  transparent (`alpha: true`), so removing the sky is what lets the page's
  own background show through. The background is now only ever `--bg`.
- **Nothing can be drawn by adding light.** The cube faces and the point
  clouds used additive blending, which on a dark ground reads as glow and
  on paper reads as nothing at all. Both now blend normally: the faces are
  tinted glass (`CUBE_FACE_OPACITY` 0.14 at rest, `HOVER_FACE_OPACITY`
  0.3, rising to `SPOTLIGHT_FACE_OPACITY` 0.6 at the peak of a glow -
  every place that used to reset a face to opacity 1 now uses these), and
  the points are ink, whose weight varies with the noise texture and
  with the gather. The point material no longer writes depth. (The ink
  was first a single dark teal; see "Each point is one of three inks".)
- **Scene colours are given as screen values.** `screenColor(r, g, b)`
  sets a colour so it shows on screen as exactly those values, for the
  same reason as the spotlight's orange (see "The invitation is one
  orange"). The edges and hover tint are the teal accent; the faces' base
  colour is a pale slate, which the scene's cyan lights cool slightly.
  The spotlight's face glow is at full strength now (`SPOTLIGHT_FACE_GLOW`
  1.0), since it shows over a light ground through a partly transparent
  face.

Checked on both layouts: the grid, a cube at the peak of its glow with
its tag, hover, the project view with the point cloud, and the drawer
open, plus the loader's exit with and without reduced motion.


Each point is one of three inks, at random
------------------------------------------

Asked for: the point cloud in dark red, orange and grey, with the colours
randomly distributed. Every point is given one of `POINT_INKS` - dark red,
the invitation's orange, a warm grey - when its cloud loads, picked at
random in the proportions each ink's `share` sets (a third each). The
pick is stored per point as an attribute (`aTone`), so the speckle is
fixed: it turns with the model rather than flickering from frame to
frame, and stays the same across the gather.

The model's own `COLOR_0` (its scanned colours) is still not used - these
inks replace it, as the single teal did before. To change the mix, edit
`POINT_INKS`: its colours, how many there are (the shader takes three;
change `uInks[3]` and the pick in fragment.glsl to match), or their
shares.


A grey fog rolls in behind an open project - a page layer, not scene fog
------------------------------------------------------------------------

Asked for: the background changing slowly while the camera zooms in to a
project, "like a slow grey fog coming in". `#fog` is a fixed layer in the
page, between the page's paper background and the 3D canvas (which is
transparent - see "The whole site is paper"). `openProject` adds
`.is-in`; `closeProject` removes it. It comes in over 3.2s, starting as
the camera begins to move, and clears in 1.2s on the way back so the grid
returns on paper.

The fog is grey at the edges and lighter in the middle - a radial
gradient - so the model sits in a clearing rather than in a uniform grey
that would flatten it. Two large, soft, lighter banks drift slowly across
it (CSS keyframes, paused while the fog is out), so it reads as fog moving
rather than a tint. Under reduced motion the banks hold still and only the
fade remains. The middle of the fog is kept light enough that the point
cloud's grey ink still stands out against it.

Why not three.js fog: the scene's own fog fades objects towards a colour
by their distance from the camera, which is a different effect - it would
grey out the model itself, not the space around it - and the scene's fog
has a history here (see "Fog is off"). A page layer behind the canvas
touches nothing in the scene and costs nothing in the renderer.

Checked on both layouts: the fog's opacity climbs over about three
seconds after the click, the drawer opens over it normally, and after
going back it is fully gone.


Double-click or double-tap zooms in on the model
------------------------------------------------

Asked for: zoom in on the 3D model with a double-click or double-tap. In a
project, `toggleDetailZoom` moves the camera to `DETAIL_ZOOM` (40%) of its
distance, towards the spot under the pointer, over 0.9s; doing it again
returns to the view it came from (`frameDetail`, or the drawer's close-up
if the drawer is open). The spot is the nearest point of the cloud along
the pointer's ray (a points raycast, `threshold` 0.06), so it zooms to
what was tapped; a tap that misses the model zooms towards the middle of
the view. The direction of view is kept, so it's a straight move in with
no turn - the same rule as every other camera move here. Any re-frame
(drawer, resize, opening a project) clears the zoomed state.

Mouse and touch are handled separately. A mouse sends `dblclick`. Touch
double-taps are timed by hand on `pointerup` (`DOUBLE_TAP_TIME` 350ms,
`DOUBLE_TAP_DISTANCE` 30px), since phones don't reliably send `dblclick`
- but some do, which would zoom in and straight back out, so `dblclick`
is ignored unless the last pointer was a mouse. Taps are timed by the
events' own `timeStamp`, not when they're handled: in testing, a busy
frame delayed handling enough to push a real 285ms double-tap past a
300ms limit. A drag isn't a tap (`wasDrag`), so orbiting by hand never
triggers it.

Checked on both layouts: a double-click/double-tap zooms in to the spot,
and a second one zooms back out (confirmed by logging the decisions, since
the software renderer used for testing draws the close-up at a frame or
two a second, which GSAP's lag smoothing stretches into many seconds of
move).


The drawer has frames for pictures, open until the pictures exist
-----------------------------------------------------------------

Asked for: space for images in the About drawer, with the frames in place
and left empty until the pictures are supplied. A project's `images` is a
list of `{ src, alt, caption, ratio }`; `showProject` renders each as a
`<figure>` under the body text (`imageFigure`). The first spans the full
width and the rest sit two to a row - a lead picture and a grid of
details, which fits the drawer's width on both layouts. `ratio` is a CSS
aspect ratio (3 / 2 by default), so a frame has its size before its
picture loads, and the drawer's layout doesn't jump when it does.

An entry with no `src` is an open frame: a dashed outline the size of the
picture to come, marked `aria-hidden` so a screen reader doesn't announce
an empty image. Rock Print has three such entries for now; filling one in
is only setting its `src` (and `alt`). Pictures load lazily, since the
drawer is often never opened. A project with images but no text still
gets a drawer handle (`hasDescription` counts them).

The drawer's background went from 94% to 98% opaque at the same time:
with pictures to show, the point cloud ghosting through the panel behind
them muddied the frames.


The cubes are labelled near the pointer, not on the spotlight
-------------------------------------------------------------

(The label chip described here has since become falling leaves - see
"Project names fall like leaves". Which cube counts as near carried
over.)

Asked for: remove the "Explore me..." tag from the pulsing cube, and show
"Project XX" when the pointer is on or close to a cube instead. `#project-tag`
reads "Project 01" to "Project 10", by grid slot (`projectLabel`), for
every cube - empty slots included, since every cube now holds a rock and
reads as a project to come. The pulsing orange cube keeps its glow; it
just no longer carries a label.

Which cube, and how strongly: the cube under the cursor (`hoveredCube`)
gets the label at full strength. Otherwise it's the cube nearest the
pointer's position on the grid's plane - the same point the flow tracks
(`flowPointer`), using each cube's current position, so a drifting cube
keeps its label - faded by distance: full within `PROJECT_TAG_NEAR` (2.8
units of its centre, about its own half-width), gone by `PROJECT_TAG_FAR`
(5.5, roughly where the next cube begins). So moving across the grid hands
the label from cube to cube, and the gaps between them go quiet. A cursor
that leaves the window (`pointerInPage`) drops it; on a phone, it follows
a finger dragged across the grid.

It's the same HTML chip as "Still empty...", restyled for paper (ink on
the panel colour, teal border; the empty tag quieter, with a grey
border), and pinned to the cube by the same `placeTagOnCube`. When both
would show on one cube, "Still empty..." wins. `pointerInPage` is declared
up with the tag elements, not next to `updateCubeTags`, because
`animate()` runs its first frame before the rest of the file has executed.

Checked on both layouts: the label on the hovered cube, on the nearest
cube between two, gone far from the grid, and replaced by "Still empty..."
when an empty slot is clicked; no "Explore me..." anywhere.


Points come in three sizes and are semi-transparent
---------------------------------------------------

Asked for: semi-transparent points, in three random sizes, with the
existing size as the middle one. Each point's `aScale` - which the vertex
shader already multiplied into the point size, but which was 1 for every
point - is now one of `POINT_SIZES` (0.6, 1, 1.6) at random, a third
each. Like the inks, it's picked once when the cloud loads, so a point
keeps its size as the model turns. The most ink any point lays down is
capped at `POINT_OPACITY` (0.6) in the fragment shader, on top of the
existing grain and gather weighting; overlapping points build up density
instead of reading as a solid surface, which is what makes the different
sizes and colours legible up close.


A hand hints at the double-tap zoom, until it's been used
---------------------------------------------------------

Asked for: a little hand appearing at random above the point cloud,
inviting a double-click, pulsing twice and disappearing. It started as a
hand (Lucide's "pointer" icon); four redrawn designs were then put side by
side over the pavilion - a fine-line hand, a solid teal silhouette, a
paper-cut hand and a handless fingertip - and the fingertip was chosen, in
the About handle's orange and a little transparent. `#tap-hint` is now a
soft orange touch point (a radial gradient) with two rings, over the
canvas. Each showing is one 2.2s CSS animation: it fades in to 75%
opacity, presses twice with a ring spreading from it on each press - the
double-tap gesture itself - and fades out. Its centre is placed on the
point. Over the orange points it's deliberately quiet; the rings are what
catch the eye.

When and where (`maybeShowTapHint`, called each frame in the project
view): first once the points have gathered (`GATHER_DURATION` plus
`TAP_HINT_AFTER_GATHER`, about 5s after the model appears), then every
`TAP_HINT_GAP` (first 7-13s at random; now a steady 5s, as asked). Each time it lands on a random point of
the cloud, projected to the screen, retrying until it finds one
comfortably on screen and clear of the bar along the top. It skips its
turn while zoomed in, with the drawer open or while the camera is moving,
and stops for good (`tapHintLearned`) the first time the visitor zooms -
at that point the hint has done its job, and repeating it would only nag.
Closing the project cancels any pending hint. Under reduced motion it
fades in and out without the presses and ripples.

Checked on both layouts: the first hint lands on the pavilion about 6s
after opening, and after a double-click no further hint appears.


Project names fall like leaves
------------------------------

(Since removed on request: the grid shows no project names at all now.
Kept here as a record of what was tried.)

Asked for: the project names on the grid not as tag-like chips, but text
that appears when the pointer comes near a cube and then falls down like a
leaf and leaves the screen. When the pointer arrives at a cube - the one
under the cursor, or failing that the nearest within `LEAF_NEAR` (3.4
units) of the pointer's position on the grid's plane - `dropLeaf` puts
its name ("Project 01"...) as plain ink text where the tag used to sit,
and it falls: a pause, then a pendulum sway down the screen, tilting with
each swing, fading out near the bottom edge. Each leaf is its own element
in `#leaves`, removed when its animation ends, so several can be falling
at once as the pointer moves through the grid.

The fall is a CSS animation (`leaf-fall`) driven by per-leaf custom
properties set at drop time: the distance to the bottom of the screen
(`--fall`), the sway's width and side (`--sway`), the tilt (`--tilt`) and
the duration (`--duration`, longer for a longer fall, so it drifts rather
than drops). The randomness is what stops a run of leaves along a row
falling in lockstep. Once let go, a leaf no longer follows its cube.

A cube drops its name on the pointer's arrival only, not continuously
while it stays near (`cube.userData.near` tracks the edge), and not again
within `LEAF_COOLDOWN` (1.6s), so hovering at the edge between two cubes
doesn't shower names. A cube showing "Still empty..." doesn't drop its
name over it. Under reduced motion a name appears and fades in place.

Checked on both layouts: a sweep across the grid drops one leaf per cube
reached; resting on a cube drops no more; all leaves are gone within
about six seconds.


Rock Print lands on a closer, steeper view
------------------------------------------

Asked for: make a phone screenshot (taken after zooming in by double-tap)
the landing view of the Rock Print Pavilion. The shot is closer and
steeper than the old one, with the pavilion filling the phone's width -
closer than fitting the cube allows - so a project's `view` gained two
settings:

- `zoom`: how much closer than the cube's fit the camera comes, straight
  along the line of sight. When it's above 1 the cube runs off the edges,
  so the "drop the cube until its top clears the bar" placement is
  skipped.
- `lift`: how far up the screen the model sits, as a share of the
  screen's height.

Either can be one number or `{ side, stacked }`, per layout, and both are
ignored with the drawer open, which has its own close-up.

The values were fitted, not eyeballed. A throwaway build (never committed)
froze the model's slow turn, finished the gather instantly and exposed a
hook to set the view; renders at the screenshot's own viewport (412x762 -
the screenshot's 1080x2000 page at the phone's pixel ratio) were scored
against it by how well their orange/red point masks overlap, first on a
coarse grid of elevation, turn and zoom, then finer. Scoring with the
render allowed to slide showed the remaining error was placement, not
angle - hence `lift`. Result: elevation 58, azimuth 4, turn 118, zoom
1.9, lift 0.14, overlapping the screenshot's mask at about 0.8-0.9
(1 would be identical) with a 3px residual shift.

On desktop the same zoom and lift push the pavilion's top off the screen,
so the side layout uses zoom 1.4 and no lift: the same angle, comfortably
framed.

The model never stops turning (`DETAIL_ROTATE_SPEED`, 9 degrees a
second), so "landing view" needs a moment. The shot is set to be on
screen as the gather completes - the moment the pavilion first appears
whole - so `turn` is 86: the screenshot's 118 less the 32 degrees the
model turns during `GATHER_DURATION`. A real-time check confirmed the
mechanism: a frame 20s after opening matched the fitted view turned by the
expected amount (0.81 overlap), with the same elevation and zoom.

Double-tap zoom and the drawer's close-up both return to this view.
