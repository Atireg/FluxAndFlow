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

Auto-rotation is off in this view. It slowly turned the cube off-axis, which
is precisely what the view exists to avoid.


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
