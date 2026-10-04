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


Opening a project slerps the camera's orientation, not just its position
--------------------------------------------------------------------------

Clicking a project used to tween `camera.position` and `controls.target`
straight across to the detail framing and leave OrbitControls to work out
the camera's orientation from them, as it does the rest of the time. That
broke specifically for this one transition: the catalog camera sits exactly
overhead (`position` and `target` share the same X/Z, differing only in Y),
which is the pole of OrbitControls' spherical math - the azimuth is
undefined there. Worse, `frameDetail`'s own geometry means `camera.position`
and `controls.target` share the same Y and Z for the ENTIRE tween too (the
detail view always looks along a fixed world axis, only the X offset
differs) - so the orbit offset's Z component is pinned at exactly 0 from
start to finish, and X crosses from 0 to negative at the very first instant.
atan2 of that is a step function: undefined at t=0, then locked to its
final value for literally every t>0. OrbitControls re-derives orientation
from position every frame, so the camera's roll snapped to its final value
in the first rendered frame while its pitch was still easing in over the
full 1.6s - seen as the whole grid skewing to a diagonal angle for the
first several frames before settling square. Confirmed with frame-by-frame
quaternion logging in a real browser: the resting quaternion
`(-0.707,0,0,0.707)` (pure pitch) jumped to one with large Y/Z components
within a single frame of the tween starting, well before position had
moved any meaningful distance.

Nudging the resting position off the exact pole was considered and
rejected: the degeneracy isn't really about floating-point noise at a
single point, it's structural (Z is pinned at 0 for the whole path by the
detail view's own geometry, not just at the start), so avoiding it would
need an offset large enough to be a visible tilt in the catalog rather than
a true fix.

`frameDetail` now captures the camera's current quaternion and separately
computes what it will be once the camera actually reaches the final
position/target (via a one-off `Matrix4.lookAt`, never by moving the real
camera there first), then slerps between the two over the same duration as
the position tween. This never re-derives orientation from a position that
might be near-degenerate - it rotates from a known-good start to a
known-good end directly. `cameraOrientationLocked` tells the render loop to
skip `controls.update()` for that stretch, since OrbitControls would
otherwise recompute orientation from the still-moving position every frame
and fight the slerp; `cameraLockGeneration` guards against a second
transition (closing the project before the first finishes opening)
unlocking too late off a stale completion callback.

The reverse (closing a project) was checked too and left alone - its
pole is at the very last instant rather than the first, and OrbitControls'
own `makeSafe()` keeps phi epsilon away from the exact pole, so the
camera's azimuth is already resolved for the entire tween and there is
nothing to fix. Confirmed with the same frame-by-frame logging: the
quaternion eases smoothly the whole way, no jump.


The detail view is a one-point perspective, square-on
-----------------------------------------------------

The camera sits on the X axis looking straight at the cube, so its vertical
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

Computed as `(elapsedTime - startTime) * DETAIL_ROTATE_SPEED`, not
accumulated per frame, matching the rest of the project's animation - see
"A cube's visual state is a pure function of its mode", below.
`startTime` is reset at the moment the model becomes visible (both the
already-loaded path and the just-finished-downloading path in
`openProject`), with rotation explicitly zeroed at the same moment, so the
model is always seen square-on at the instant it appears - the same reason
`openProject` already zeroes the cube's own rotation and scale on click.

`frameDetail`'s fit is computed once, from the model's bounding box at
that same zeroed instant, and is not recomputed as the model turns - a
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

`DETAIL_MARGIN` is above 1 where the whole box should fit with air around it
and below 1 where the view should crop into it. Phones crop when the drawer is
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

Orbiting the catalog ends in a click event, which opened whichever cube the
pointer happened to come to rest on. A press that travels more than 5px is
treated as a drag.


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

The switch is instant (a plain `display: none`), not animated. It happens
at the same moment the drawer starts sliding out, which reads as the
drawer absorbing the title rather than as a glitch, but it was not
deliberately designed that way - a cross-fade would be the thing to add if
it ever looks abrupt rather than intentional.

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
and the clock. Nothing is ever incremented or accumulated, so nothing can
drift, and nothing needs an explicit reset when a mode ends: the next frame
simply computes a different mode's state instead. `updateCube()` picks the
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
duration) - `selectedCube` is still cleared immediately, so nothing
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


The spotlight has its own colour, separate from the drawer's warm accent

It originally blinked to `#c42941`, the exact colour the drawer's pull
handle pulses (`--warm` in styles.css), specifically so "warm red = click
me" would be the one consistent invitation across the catalog and the
detail view. It now blinks to a dedicated, lighter `#ff5c5c` instead,
chosen for a brighter, more energetic flash to go with the faster rock and
the jump - a deliberate request, not a drift back towards two colours
saying the same thing. If the two ever need to read as one signal again,
point `spotlightGlowColor` back at `warmAccentColor`'s value rather than
inventing a third colour.

The blink was edges-only at first; the face (`cube.material.color`) now
lerps the same way, on the same `glow * intensity` fraction, so the cube
reads as lit up inside rather than only outlined. This exposed a gap
`openProject` already had a fix for on the rotation and scale fronts but
not this one: the clicked cube's face fades out over 0.8s rather than
vanishing instantly, so a residual glow colour would show through as a
brief red tint during that fade if nothing reset it. `openProject` now
resets face colour alongside edge colour, rotation and scale - the same
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
