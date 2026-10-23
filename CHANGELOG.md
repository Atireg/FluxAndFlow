# Session changelog

One entry per working session with Claude. Each entry is a terse summary
with the commit range, not a transcript — the "why" behind anything
non-obvious belongs in `DECISIONS.md`, not here. Keep entries short; this
file is meant to stay cheap to read at the start of a session, not to
become the record of everything that was said.

---

## Session 1 — 2026-10-03 / 2026-10-04

`3180d41`..`3d2eea1` (branch `ccr-584d8563-rtv32f`, merged to `main` through
`f0b9124`)

Starting point: a three.js experiment with no data model, no content
layer, and no deployment — `git log` before this session shows a single
"Initial commit".

- **Data model.** Replaced a viewport-sized, randomly-populated cube grid
  with a fixed `SLOT_COUNT` grid driven by a `projects` array. Fixed a bug
  where portrait phones got zero cubes.
- **Detail view.** Built the split view: 3D model + description. Went
  through several iterations on the camera — oblique → orthographic →
  one-point perspective, square-on to the cube, settled at 45°/30°
  (side/stacked) after rendering comparison strips. Found and fixed two
  real rendering bugs along the way: inverted fog hiding the cube, and
  faded faces still writing depth and flattening the perspective.
  Description moved out of a fixed panel into a pull-out drawer so the
  model gets the full canvas by default.
- **Mobile.** Separate lens and crop margin for the stacked (<860px)
  layout; the project bar's height is now reserved out of the fit so the
  title doesn't land on the model. That reservation then combined with the
  open drawer to leave very little vertical room on small phones - fixed
  by moving the title into the drawer's own header once it is open on a
  narrow viewport, rather than shrinking the drawer (see DECISIONS.md).
- **Assets.** The point cloud declared Draco compression it didn't use and
  wasn't using it correctly even if it had (Draco doesn't apply to
  non-indexed point primitives). Quantized instead: 2.2 MB → 922 KB, and
  stopped shipping a 336 KB decoder for nothing.
- **Deployment.** Added the GitHub Pages workflow, made the repo public,
  disabled production sourcemaps, and published for the first time.
  Working tree is clean and `main` tracks the live site end to end.
- **Docs.** This file, `CLAUDE.md`, and `DECISIONS.md` didn't exist before this
  session; `README.md` existed only as the original TODO list and hadn't been
  touched.

- **Process.** Added a standing instruction in `CLAUDE.md`: after a fixed
  issue, update whichever of README/DECISIONS/CHANGELOG it made stale,
  rather than letting the docs drift and catching them up later. This
  entry and the mobile bullet above are themselves the first application
  of it - they were out of date against `e0c070e` until this update.

Open at end of session: real project copy (year/role/context/body/credits
are all intentionally blank — see DECISIONS.md), empty-cube messaging,
per-project URLs, images in the drawer. See `README.md` for the full
list.


---

## Session 2 — 2026-10-04 / 2026-10-11

`e0c070e`..(branch head) on `ccr-584d8563-rtv32f`, fast-forward merged to
`main` on each "merge and build" (`git log origin/main..` shows anything
not yet live). The why is in DECISIONS.md; rejected iterations are under
its "Tried and removed".

- **Catalog.** Cubes became glass pebbles, then graphite ones (teal glass and
  pencil hatching tried and dropped), each its own shape and slowly changing
  it, a random size on each visit; touching, they push each other firmly apart.
  Rebuilt on one pure state function per frame: they float and rock, the
  pointer stirs them, nothing orbits; spaced wider (1.4). One pebble at a time
  glows orange and jumps, its name (the project's title, or "Project XX")
  hanging below on a soft, simulated string that swings in gusts, tied on with
  a dot; hover changes nothing. Names scale with the pebbles on screen and draw
  over them. Pebbles hold the rock or the project's own model, in graphite;
  empty slots say "Still empty...". Opened projects' pebbles stay darker,
  remembered in the browser. The grid arrives slowly, a pebble at a time,
  surfacing out of the paper as the loader clears and on the way back from a
  project, then their contents one by one. The loader's streams carry on among
  them, in the scene, parting round each and drifting towards the mouse or a
  finger. Smaller pebbles among them came and went.
- **Opening a project.** An instant boom, the others fall slowly while the
  camera moves in, and the clicked pebble dissolves into a cloud of points
  that hands over to the project's own (a crossfade, not an overlap). Camera
  moves only tilt (the old 90° roll fixed at its source); a grey CSS fog
  rolls in behind.
- **Rock Print.** Points gather out of a scattered cloud, in three inks and
  sizes; it lands on a view fitted to the user's phone screenshot, turns
  slowly (80s a turn) while the camera nods (`view.sway`). Double-click /
  double-tap zoom, hinted by a white touch point sized to the screen. The
  drawer moves the model left on a wide screen, a close-up on a phone, and
  holds five photos; its text is still a placeholder.
- **Emergent Space** (slot 1), the second project: the clicked pebble's
  points fall into a ground (turning with the pile), and three of the user's
  aggregates, drawn solid in the inks, drop onto it with live physics
  (cannon-es, loaded only for it), falling into view in slow motion once the
  camera has arrived, tumbling into an interlocked pile, then turning - a
  new drop each time. Each is the user's plain mesh; any mesh .glb now
  works, sampled into points as it loads. Its pebble holds the aggregate
  itself, in the rock's ink (`thumbSize`). An About drawer with placeholder
  text, to be replaced, and five pictures (diagrams full width, `wide`);
  opening it zooms in on the three aggregates (closer on a phone, where
  it hadn't read as a zoom).
- **Tails.** Every point on the move - gathering into Rock Print, flying
  out of a clicked pebble, falling into Emergent Space's ground - draws a
  tapering tail, computed in the shader from where it was a moment
  before; the tails vanish as the points settle. Shortened after a first
  look, and Rock Print's gather slowed from 3.6s to 5.4s.
- **Site.** "Paper" palette throughout (the dark `Sky` dome removed); an
  inline start-up loader with real progress, at least 5s, whose streams
  then carry on in the scene (above); clouds load only on click after
  `?cloudtest` measured the alternative.
- **Safari.** Tapping a pebble did nothing there: selection now uses the
  canvas's `pointerup`, not a window `click`. The names and the zoom hint
  showed behind the pebbles and the cloud: overlays now stack by z-index.
  Shaders made spec-defined and failures made visible too. Fixed blind;
  still to confirm.
- **Docs.** DECISIONS regrouped (contents, "Tried and removed") and purged
  to what's current; README's TODO split into next up / open / done;
  CLAUDE.md gained "Where to pick up", the project fields as they now are
  (`thumbSize`, `points`, `drop` and its `solid`, an image's `wide`), notes
  on the pebbles, the hanging tag and the pile, the pebbles' random sizes,
  the arrival, the streams and the tails, how the user likes to work, and
  testing tips (finding pebbles, one browser at a time, tuning physics in
  Node); cleaned at the end of the session.

Open at end of session (see README, "Next up"):
- Safari: confirm the tap and the stacking fixes.
- Rock Print's real copy (live text is placeholder; state the role
  accurately), and Emergent Space's (its drawer is placeholder too);
  captions/credits for both projects' pictures.
- Emergent Space's physics drop: confirm it runs smoothly on a real phone;
  the scene's streams too (one device pixel wide there - maybe faint).
- Model licensing/attribution for the public .glb files is unchecked.
- A drawer video was discussed, not added - README has the agreed approach.
- No per-project URLs; `?cloudtest` and `src/loader/` (dead code) can go.


---

## Session 3 — 2026-10-11 / 2026-10-18

`09484e9`..the commit carrying this entry, on
`claude/react-project-structure-gdpqdq`, fast-forwarded into `main` at each
"merge and build". Opened as a restructure; most of it became a run of
small look-and-feel requests on the two projects. The why for all of it is
in DECISIONS.md.

**Structure (no look-and-feel change).**
- `src/script.js` (3,733 lines) became React for the page
  (`src/app/`, `src/components/`), an engine of focused modules for the
  canvas (`src/engine/`) and one module per project behind one schema
  (`src/projects/`). The scene stayed imperative three.js; per-frame HTML is
  written through refs, never React state. No per-project code in the
  engine. The temporal-dead-zone trap went with the single file.
- Dead code removed: `src/loader/`, `src/shaders/grid/`.

**Catalog.**
- Each pebble's warmth drifts with its own shape waves (chosen from five
  previewed options), as a multiplier on the graphite, and the same wave
  varies how heavily it's laid down (`TONE`). First retuned after the user
  saw no change - the check had read the canvas, not the composited page.
- An empty pebble answers a click with two lines and no box - "under
  construction", "still settling", "yet to take shape" or "a grain not yet
  fallen", at random (it said "Still empty..." in a chip).

**Emergent Space.**
- The turn starts when the pile looks still, not when cannon sleeps.
- "Drop again" in the bar, later a double-click instead (hinted "drop
  again" on the tap hint's string, `doubleClick: 'drop'`); drops slow to
  40% playback.
- Velocity arrows and live m/s while falling (`drop.velocity`); pulsing
  dots where the aggregates interlock (`drop.contacts`) - graphite, then
  cyan, then blue - shown only once every aggregate is asleep and dropped
  if their sides have parted (they hung in the air before).
- Between drops (`drop.closeUp`): the camera moves in on an interlock,
  following it as the pile turns, for 5s, backs out, the floor slows to a
  stop, and 5s later it drops again, the old pile dissolving away. (First
  a plain repeat every 5s, then 10s.)

**Rock Print.**
- Every 10s the camera moves in by itself and back out (`autoZoom`),
  in turn on a point of the pavilion, from inside at eye height among the
  columns, looking along the clearest line between them, and from the
  same spot facing back the other way
  (`eyeLevel`; a wider lens and a closer near plane for it - a cap on
  point size there was taken out again). The first comes as the first tap
  hint lets go, 5.6s after the gather, not 10s. The camera's nod is slower
  (22s).
- A double-click holds the pavilion still until the next
  (`doubleClick: 'hold'`, hinted "pause").
- The gather no longer jumps: it runs on its own clock, a frame's step at
  a time (at most 0.1s), and its shaders compile as the model loads rather
  than on its first frame. Only every fifth point draws
  a tail now, to lighten it (every third still lagged a bit).
- Seen from straight above, the camera's nod no longer tips it over the
  top (it shook back and forth); and the double-tap hint's dissolve no
  longer filters the whole screen (it froze the page for seconds) - only
  the dot and its words break up, the string fades.

**Categories.** Projects are research, teaching or the real world
(`category`, required; a tag after the name in the bar). Both projects are
research; the empty slots stand in for four of each other kind. A filter
top left in the catalog brings one kind forward and pushes the other
pebbles back along the camera's line to half their size, and fainter (straight down
clumped them in the middle); only the chosen kind jumps (one glowing on
another kind settles as soon as the choice changes), and a click on a sunk
pebble brings its kind forward.

**Landing page.** The first thing on opening, over the loader's floating
particles: three short paragraphs written with the user (hidden currents,
their background, the services - first one paragraph on self-organised
criticality, then a plain services list), and "Welcome to the F&F
playground" (worded three ways before it). It scrolls if it outgrows a
small phone. The playground loads behind it: the button stays grey until
it's ready, then turns orange and leads straight in - no loading screen,
no minimum time (it was 5s, then 8.3s while the loader built up "Nothing
here is fixed..." a line at a time; those words went with it). The
back link in a project reads "F&F playground" (first "My playground",
before that "All projects").

**Tap hint.** "double-tap to" ("double-click to" with a mouse) over what
it does - "zoom", "pause", "drop again" - hangs from the dot on a black,
bouncing string, the catalog's rope (`createRope`); first just
"double-click". It pulses twice over (4.4s), then falls like a leaf -
drifting and tilting, the string trailing - off the screen; double-tapped,
it dissolves into specks the way the aggregates do. Hints come every 8s.

**Safari: every pebble was Rock Print.** The `?cloudtest` load test
(every slot a copy of the first project) was still in the site, and
Safari's address bar had remembered a `?cloudtest` address - so there every
pebble read and opened Rock Print, Emergent Space was missing and the
filter did nothing. The test mode is removed.

**Emergent Space's film** in its About drawer, above the pictures, from
Vimeo (`videos`, `components/ProjectVideo.jsx`). On a phone it opens in the
phone's own full-screen player, and "Watch on Vimeo" sits under it.
Rock Print's two films the same way. On a phone, every drawer picture runs full width,
one after the other.

**The real copy.** Both drawers' placeholder text replaced: year, role,
context, three paragraphs and credits each, drafted from the published
descriptions (ETH News, the Gewerbemuseum Winterthur and designboom for
Rock Print; the ITECH / ICD Stuttgart thesis page for Emergent Space) and
approved by the user.

**Pictures enlarge.** A click on a drawer picture opens it whole over the
page, on paper, with its caption (`components/ImageViewer.jsx`); a click
anywhere or Escape puts it back, the drawer still open.

**Links.** Each project has its own link - `#rock-print`,
`#emergent-space` on the site's address - shown while it's open, so it
can be copied; opened, it goes straight through the loader to the
project. Back and Forward close and reopen it.

**Docs.** All four brought up to date at the end of the session: names from
the single-file days replaced, misfiled DECISIONS entries moved, this
entry condensed.

**Cleanup** (asked for, no change on screen): repeated pieces pulled out
into shared ones - the easing curves (`engine/ease.js`), a world point to
screen pixels and a pointer to the camera's coordinates (`rig.toScreen`,
`rig.pointerToNdc`), the seconds since a model was shown (`detailSince`),
a lens's visible height (`halfHeightAt`), the points' ink choice
(`shaders/pointCloud/ink.glsl` with `pointInkUniforms()`), the tag's
string (`components/TagString.jsx`), a click kept off the canvas
(`components/clickOnly.js`) and the loader's paper halo (`--loader-halo`).
Dead code out: `lil-gui`, unused exports, leftover shader lines and a
stale file map. A second pass: the page's small words into
`src/app/words.js`; every tag over the canvas bare text with the paper
glow on `.cube-tag` itself, the two on strings sharing `.cube-tag--hanging`
(the hint no longer borrows the spotlight's class); the hint's filter set
once rather than every frame; `halfExtentAlong` in framing. A third: the
drawer's pictures and films share one frame (`components/DrawerFigure.jsx`)
and one set of CSS; CLAUDE.md rewritten to half its length, the detail
left to DECISIONS.md; README's finished items moved under "Done".

Checks were headless (software WebGL, both layouts) with throwaway hooks,
removed before each merge; no console errors in any run.

Open at end of session (see README, "Next up"): Safari to confirm (the
blind fixes, and the playground now that `?cloudtest` is gone); picture
captions and credits; Emergent Space's drop, the
streams, Rock Print's inside views and its gather's smoothness on a real
phone; the films' shape (assumed 16:9); model licensing. Small: `smoke.js`
is parked, the points' ink grain does nothing (no UVs - README), and the JS
bundle is one 905 KB chunk Vite warns about.


## Session 4 — 2026-10-18

**A third project, kh ReUse** (slot 3, the real world, `#kh-reuse`; the name
and "knippershelbig" written exactly as the user writes them). A laptop,
made in code, drawn solid in light grey with rounded edges, open, its
screen to the visitor, not turning and not orbitable. Clicked, a third of
the pebble's points settle onto the screen in the clouds' inks and float
there with tails; 5s in the camera moves in square-on to the screen,
stopping short so the laptop's edges show and its top clears the title,
and the user's recording plays there as the points fade away. A
double-click pauses the film and plays it on. On a phone, a phone made in
code instead, playing the mobile recording; each screen is shaped like its
film, so none is cropped. The About drawer pulls back to the whole device.
Its pebble holds a reuse sign. Drawer: the user's text (with links to the
live demo and knippershelbig, and notes that it was written from scratch
before AI tools were everyday and that the data is fictional) and five
screenshots, two desktop across the drawer and three phone ones two to a
row. New project settings for all of it, no per-project code: `solid`,
`still`, `orbit`, `screen`, `screenVideo`, `phone`, `view.fillScreen`,
`view.drawer`; pictures' `pair`; drawer text's `[words](https://...)`
links. The model scripts are in `tools/models/` (`npm run models`).

**A fourth project, Nap Nap Hooray** (slot 4, the real world,
`#nap-nap-hooray`): the user's baby-sleep website, on the phone made in
code with the pebble's points floating on its screen (no recording yet), a
crescent moon in its pebble (`tools/models/moon.mjs`), and the user's text
in its drawer - which can now hold bulleted lists (a `body` entry that is
an array).

**Loading, with a spinner**: kh ReUse's laptop (and phone) and Nap Nap
Hooray's phone turn slowly while their film loads, the points on their
screen circling like a loading sign; loaded, the device turns back to face
the visitor before the camera moves in and the film plays. Nap Nap Hooray
has no film yet, so its phone keeps turning. Its moon made smaller. The
turn and the circle last at least 6s from opening, so they show on kh ReUse
too when its film is in at once.
Then, asked for, only the circle: once the film has loaded the points fade
away where they are, rather than floating about the screen first.

**Lighter pebbles**: the face an unlit material doing only its graphite
shade (it worked out the full scene lighting each frame and threw it away),
a quarter of the vertices, and the shade following the moving shape rather
than sliding over it - after the user saw them tremble and jump.

**Landing page**: the three paragraphs fade in one after another, slowly,
then "Welcome to the F&F playground" last.

**The way in without a jump**: "Welcome to the F&F playground" followed,
the currents run on, darker and faster, for 1.6s while the playground
compiles what it will draw behind them; then the page fades and the
pebbles surface (they jumped as they compiled on their first frames).
The scene's streams then take over the landing page's own particles where
they are, easing from its pace to theirs, rather than new ones appearing
as the old faded.
Nor does anything pop in as the words fade: the orange glow and its name
wait 3s for the pebbles to surface, and the filter fades in with them.
Still a small jump reported: the scene is now also drawn once behind the
landing page with everything shown (the thumbnails reach the GPU before
they grow in), and the fading words sit on a layer of their own.
The jump was the pebbles' own rise: it set off at full speed from the
first frame. It now eases in and out (`smooth01`), starting from rest.
And the landing page's own currents no longer vanish in one frame at the
handover: they keep flowing as they fade over the scene's (0.9s).

**Playground**: empty pebbles hold nothing (the rock is gone from them);
the double-click hint comes round every 20s rather than 8, on every
project.

**Cleanup** (asked for): the model scripts moved from a scratch folder into
`tools/models/`, sharing one glTF writer (`glb.mjs`) and rebuilding the
three models byte for byte; repeated code folded (the film-path check in
schema.js, the tap hint's spot search in detail.js); the session's
DECISIONS.md entries rewritten as one per subject, CLAUDE.md brought up to
date. A second pass: the laptop and phone projects' shared settings in one
place (`src/projects/devices.js`, `...DEVICE`), an unused easing removed,
comments left over from the floating points and the cyan lights corrected.

Checks were headless (software WebGL, both layouts, the films as WebM
copies since this Chromium can't play H.264); no console errors in any run.

Open at end of session (see README, "Next up"): kh ReUse on a real phone
and in Safari - autoplay of the film, the two-step camera, the double-tap
pause; the knippershelbig link (unreachable from the container); the rest
as at the end of session 3.

## Session 5 — 2026-10-19

**Nap Nap Hooray's recording**: the user's film of the site now plays on
its phone, as kh ReUse's does - the phone turns and the points circle while
it loads, then the camera moves in square-on to the screen; a double-click
pauses it. The upload (1170 x 1992, 10.5 MB) was the screen's shape exactly,
so it was scaled to twice the screen (780 x 1328, 3.2 MB) rather than
copied as it was.

**Devices higher and closer**: kh ReUse's and Nap Nap Hooray's devices sat
low. The close-up on the screen now puts the device's top just under the
title rather than centring the screen below it, and comes in closer
(`fillScreen` 1.05, the sides kept); the first, whole-device view is a
little closer and higher too (`zoom`, `lift`). Measured in both layouts:
nothing reaches the title.

**No fog**: the grey fog that rolled in behind an open project is gone, on
every view (`Fog.jsx` and its CSS removed).

**The loading circle lets go gently**: once a film has loaded, its points
drift outwards as they fade (2.2s, eased) rather than fading where they
are, and the film waits for them to be gone before it starts.

**Nap Nap Hooray's drawer** opens with a paragraph the user chose (option 2
of three): having a baby as the busy, messy part of the real world, and the
project built with the help of AI agents.

**New films, sharper**: the user's new recordings for both projects - kh
ReUse's desktop one at 2560 x 1440 (copied as it came, 4.3 MB), its phone
one and Nap Nap Hooray's at 1170 x 1992, three times the phone's screen,
re-encoded at full size to 7.3 and 6.4 MB (from 15.6 and 12.4).

**Clear of the drawer on a phone**: on a short phone the device ran under
the About drawer's handle (and its top into the title); with the drawer
out, the handle covered its foot. On a phone the device is now always
fitted to its own outline between the title and the handle, parked or
pulled out. Measured at 375 x 667 and 390 x 844: clear in every step.

**White screens, rounded films**: every phone's and laptop's screen is
white, with rounded corners, while its film loads, and the film plays
clipped to the same corners.

**No pause before the film**: it waited for the loading circle's points to
be gone and then faded in over 1.2s; it now starts as the last of them
fade and comes in over 0.7s.

**Smooth screen corners**: the rounding was a 512px mask, pixelated close
up on a sharp screen; it is now worked out per pixel in the shader.

**No jump as the pebbles surface**: the user's screen recording showed the
canvas stalling for about 0.6s as the landing page left, and every pebble
then jumping to where its rise should have got to. The rise (and the
orange glow waiting on it) now runs on its own clock, a frame's worth at
most a frame, so a stall pauses it instead.

**kh ReUse's drawer**: "The author wrote both the frontend and the backend
from scratch, ..." moved, asked for, to follow the sentence ending "Head of
Digital Technologies", in the same paragraph; and the user's "Tech
overview" list added at the end of the drawer's text, the old one-line
"Tech stack" sentence removed.

**Nap Nap Hooray's drawer rows**: 2026, "Web developer using AI",
"Sleepless nights and cranky days". **The drawer out, a device square-on**:
with the About drawer open the phone (and kh ReUse's laptop, the same
code) stays square-on, its screen parallel to the window, beside the
drawer on a wide screen rather than seen from above.

**Nap Nap Hooray's film swapped** for the user's orange version (1170 x
1992, re-encoded at full size to 6.3 MB).

**Nap Nap Hooray's pictures**: six phone screenshots of the site in its
drawer, two to a row on a wide screen from the first (a new picture
setting, `half`) and one to a row on a phone.

**Emergent Space's ground back**: its pebble's points no longer settled
into the ground under the aggregates - since the loading circle went in,
which normalised a project's zero screen vectors into NaN and mixed that
in at weight 0 (still NaN). Bisected headless; the ground is chosen with a
condition now.

**Emergent Space's drawer** ends with a sentence the user chose (option 3
of three): the aggregates dropped with real-time physics in the browser,
the arrows and dots measured live.

**Cleanup** (asked for): repeated code folded into shared helpers - a
box's corners (`boxCorners`, framing.js, used by the pebble's fit and the
device's), the drawing's pixel ratio (`pixelRatio`, rig.js, used by the
renderer twice and the pile's contact dots), the arrival, sink and fade
laid over every pebble (`layOver`, index.js, three copies), and the
devices' shared view (`DEVICE_VIEW`, devices.js). CLAUDE.md rewritten
where it had grown by accretion: one entry for the devices' shared
behaviour, the shared helpers listed, and how films, canvas-only shots,
bisecting and a user's screen recording are checked headless.

**Nap Nap Hooray's opening paragraph**: "...built this project in
collaboration with the sleep consultant Hristiana Yovkova-Arnaudova and the
kind help of AI agents" (the user's words).

**A fifth project, Frameless Glass Structures** (slot 7, the real world,
`#frameless-glass`): the user's Rhino 7 model of a glass pavilion, sent as
OBJ + .mtl and converted by a new `tools/models/obj-to-glb.mjs` into seven
parts named after its materials. Drawn solid, each part in its own look
(new `parts` setting: metal graphite, plinth light, glass and fins
see-through - a new `opacity` for the ink material); the person beside it
not drawn but formed by the pebble's points as they fall (new `figure`
setting), turning with the model. A proposal of looks; no drawer text,
pictures or thumbnail yet.

**Frameless Glass Structures, first round**: the person's points finer
(a quarter of their size once landed); the four steel pieces along the
ridge of the sloping ends (Custom 7 and 8, taken for glass fins) in the
steel's look; a double-click stops its turn. Then the person in three
greys (a project's own `inks` for its pebble's points) and the timber warm
oak (option 1 of four).

**Hover over Frameless Glass Structures' parts**: from the user's drawing
- eight glass sheets GS1-GS8, the joints with their angles, the supports.
The model is converted again with each named (`tools/models/frameless-glass.mjs`
over a refactored `obj-to-glb.mjs`); over a part (a tap on a phone) it's
picked out, the turn holds, and a card says what it is (`info`, `PartInfo`).
Checked headless: the card follows the part, the turn holds while on it
and goes on after.

**Frameless Glass Structures' drawer**: the YouTube film (films can now be
YouTube ids, from youtube-nocookie.com, beside Vimeo numbers) and five of
the user's pictures - the pavilion, the ridge from below, a joint close up
(two to a row), the sloping end and the joint's section drawing (across the
drawer). Its text offered as options; the knippershelbig page it was to be
drawn from is unreachable from the container.

**Frameless Glass Structures on a phone** opens as the user's screenshot:
from high above, its length up the screen, larger and higher (a view's
`elevation` and `turn` can now be per layout).

**A section through Frameless Glass Structures**: a slider at the foot of
the window moves a cut across the pavilion's length (`section`); the far
part is cut away, an outline marks the cut, hover skips what's cut. Then
each part's cut edges traced in black, so the connection detail reads.
And a floor (`floor`): a soft disc at the person's feet, fading into the
paper, a faint shadow under them - they no longer float. Then the steel
lighter grey and flatter (no dark gaps between the sheets), and zoomed
right in the model no longer breaks: the near plane follows the camera
(`keepNear`) rather than staying at 1. And each glass sheet's upper ply
outlined in thin black (marked by the model's script, drawn by the site).
The section's direction flipped: the other part is kept. The floor moved
down to the foundations' underside, the person set down onto it. And it
stands still: no turn (`still`), a double-click zooms. Its drawer text:
option 1 of the three offered. Under its title, a small orange line (a
project's new `notice`): "This part of the website is still under
construction." And a `tour` as it opens: one full turn, the chosen view
(the desktop's now too), then the cut slides to just past the middle as the
camera closes in square-on on the ridge joint; the visitor's own moves stop
it. Then the turn slower (16s) and the camera following the cut: square-on
to it where it starts, and along with it as it slides in. Then one turn
only, ending facing the cut, and an end view like the user's screenshot: on
the ridge joint where it's cut, a little from the side and above; the
plane's outline larger and shown only while the visitor handles the model
or the slider. Then that end view steeply from above (a second screenshot),
and the parts' cut faces filled orange; the glass sheets' outlines dark
grey, not black. Then a clean-up of this round's code: the solid shaders'
grain and length snippets shared (`INK_GRAIN_GLSL`, `ALONG_VERTEX_GLSL`),
where a section cuts worked out in one place (`sectionAt`), the tour's cut
and the slider moved together (`cutAt`), and the tour's framing reading
the parts' size the section measured once rather than every frame. Then
the tour's turn faster (10s), its end closer and less steep (45 degrees),
and the orange fill sized to the cut - closer in it had filled a patch
above the model. And the section ends through the middle of the ridge
joint's trapezoid connection plate nearest the middle (`cut` 0.472).
The orange fill rebuilt from the cut's own outlines - the stencil had
filled a whole glass panel through a gap in a part. With the drawer out,
the kept part seen from the cut (the user's screenshot). And the drawer
text replaced by a rephrasing of the user's ZIM research text, the
funding line as its credits (approved with "merge and build"). Then the
jump just before the close-up settled: the move down to the section was a
tween the following cut short; now it's placed frame by frame on the
tour's clock. Then no pause after the turn - the section slides as soon as
it ends, the camera coming down onto it as it goes - and the turn 9s.
Then: half a turn (5s); a double-click plays the tour again; the year
(2024), role (Principal investigator) and context rows; all nine pictures
(four new: the tool's diagrams and the thermal studies) set among the text
by subject, with the film after the intro (`after`, new); and the orange
fill drawn with the stencil even-odd from each part's cut, which fills the
ridge profile the user circled. And the phone ends on the same close joint
view as the desktop (`reach` per layout). Then the section comes in from
the other end (`section: { reverse: true }`), the tour closing in on the
mirrored ridge joint GS3_GS7, and the fill counts windings - one glass
sheet's lower plies, modelled twice, had been left empty. Then the cut
ends on the plate just short of its bolt hole, and the camera no longer
jumps as it closes in (aimed where the cut will end). The person formed
by a third of the points; the joint drawing as the pebble's thumbnail
(`thumbImage`, new). With the drawer closed, the view onto the section
stays (`view.drawer.stay`). The tour's turn always turns again (it could
cancel itself to almost nothing), faster (4s). Five more pictures in its
drawer by subject: lamination, the factory, the assembly after
Construction; two thermal simulations after Thermal analysis. Then the photo looking up at the ridge taken out (asked for). And the "under construction" line under its title taken off. Then a
clean-up: no unused code found (the parked smoke aside); Frameless Glass's
own comments, the tour's descriptions in the schema and detail.js, and
the README's list of what a project can say brought up to date. kh ReUse's two phone forms side by side on a wide screen (the first `half`).

Open at end of session: as at the end of session 4; a seventh Nap Nap
Hooray picture, to come as a file; Frameless Glass Structures' year,
role, context and thumbnail.

---

## Session 6 — 2026-10-22

Branch `claude/loving-ramanujan-stqa6z`, not merged.

- **The path.** A fourth choice in the filter, after The real world: every
  pebble sinks and "The path" appears under the filter, with a washing line
  under it moving in the wind and ten of the tap hint's dots hanging from
  it on threads, each swinging (`PathView.jsx`). The spotlight rests while
  no pebble is in focus. Merged. Then the pebbles fade out completely in
  it, and can't be picked while gone. Then the dots move more organically:
  noise for wind, gusts crossing the line, threads of different lengths, a
  swing to and from the visitor too, a jolt as the line moves. Then each
  dot a milestone from the user's CV, labelled under it (only the year on a
  phone). Merged.
- **Rock Print Pavilion**: the role is "Project lead" alone; the drawer's
  last sentence (the first Rock Print, with MIT) taken out.
- **Pictures in the text**: an image's `after: n` places it after that
  paragraph.
- **kh ReUse and Nap Nap Hooray**: their drawer text shortened, the tech
  lists most (approved), and each picture placed by the paragraph about
  what it shows. Merged.
- **The path's cards**: hovered or tapped, a dot presses twice like the
  tap hint and a card with details and a picture from the CV drops from it
  like the hint's leaf, settling under it; let go, it falls away.
- **The path on a phone**: the line runs down the screen, the dots flying
  from it like flags, fluttering, each labelled beside it. Merged.
- **The streams in the wind**: in the path view the background's streams
  blow left to right with the wind, in gusts (`setWind`), and no longer part
  round the faded-out pebbles.
- **The path's cards stay longer**: 1.8s after the pointer leaves, then a
  slower fall; a wider hover area round each dot.
- **A link to the path**: `#path` opens it; choosing it puts it in the
  address, Back leaves it.
- **The path's milestones, revised by the user**: the Doctor of Sciences
  taken out; the Deputy Department Chair in its place, 2021 – 2023, in
  Melbourne; a last one, current: Associate, Head of Digital Technologies
  at knippershelbig, Stuttgart, with Frameless Glass Structures' picture
  (no details yet - a card shows only what it has).
- **"tap me!"** (the user's words) over the path's dots, riding the line:
  over its middle, or beside its top on a phone; and a dot's card opens
  from its words too, hovered or tapped.
- **"click me!"** over the dots instead of "tap me!" (the user's change).
  Merged. Then it turns up over one dot at a time, at random.
- **The path, revised again**: the flags on a phone start already blown
  out - they swung wide at first; Rock Print Pavilion taken off the path;
  the GradX graduation exhibition director role (2020 – 2021) in its
  place by date, from the CV, with its picture (the first on its last
  page).
- **The knippershelbig card's details**: the user's text reworked to match
  the others (option 1, approved).
- **GradX by its dot: "Director of exhibition"**, the full title on its
  card (`title`); on a phone each flag's label shows the place too.
- **Lecturer in Architecture: 2019 – 2023** (the user's correction).
- **"click me!" in orange** (`--warm-text`, the invitation's orange).
- **The path's words can't be selected** - a tap marked the word and
  offered a search. "Student employee" is "Trainee"; an eleventh dot,
  Trainee 2014 – 2016 at SL Rasch GmbH Special & Lightweight Structures,
  with the user's picture (the Haram in Mecca from above) - then Digital
  Designer, in Stuttgart, its card's details the user's (option 1).
- **The places off the flags' labels on a phone again** - too crowded;
  they're on the cards.
- **A twelfth dot**: JavaScript Developer Degree, 2023 – 2025, SoftUni,
  online qualification; its card's details option 1 (approved) and that
  the knowledge built this website, its picture a screenshot of the
  playground.
- **The path's degrees in light grey**: the bachelor, the master and the
  JavaScript Developer Degree (`degree`).
- **`#path` skips the pebbles**: the path is chosen as the page opens and
  the pebbles are gone before they surface (they showed briefly).

Open at end of session: as at the end of session 5; the path's ten
milestones checked by the user.
