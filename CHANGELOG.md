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

**A third project: kh-reuse, a laptop** (slot 3, "The real world",
`src/projects/kh-reuse.js`, `#kh-reuse`). Its pebble holds a small laptop and
opens a laptop - lid open, keys, trackpad and screen - gathering out of
points. The model is a plain mesh built in code (`static/models/laptop.glb`,
64 KB), sampled to points like Emergent Space's. Named "kh-reuse" by the user;
no drawer until they give the text.

**kh-reuse, solid and still.** The laptop is now drawn as the model itself
(new `solid` setting), not a point cloud, and doesn't turn (`still`): open,
screen square to the visitor. Something is to be shown on its screen later.

**The landing page's paragraphs appear one by one**, each fading up over 2s,
1.8s apart, from 0.8s in (`.loader__about p` in styles.css); all at once
with reduced motion.

**kh-reuse, rounded and light grey.** The laptop's edges, keys, trackpad
and screen are rounded, and the model is light grey (`solid: { lit,
shade }`, a new option for a solid model's colour). Its pebble's thumbnail
stays graphite.

**kh-reuse: points on the screen.** The pebble's dissolve no longer fades
away for the laptop: its points take the clouds' inks, settle onto the
screen and float about there while it's open (`screen`, a new setting naming
the model's screen mesh). The film to play under them is still to come.

**kh-reuse: fewer points, with tails, and a reuse sign.** A third as many
points float on the laptop's screen, each with a tail. Its pebble holds a
small 3D reuse sign (three chasing arrows, `static/models/reuse.glb`)
instead of the laptop.

**"Welcome to the F&F playground" comes last** on the landing page, fading
up 1.8s after the third paragraph starts.

**kh-reuse can't be orbited** by hand (`orbit: false`, a new setting): the
laptop's screen stays square on. A double-click still zooms.

**kh-reuse: the film on the laptop's screen.** The user's recording
(`static/videos/kh-reuse.mp4`) plays on the screen, muted and looping,
under the floating points, fading in once it starts (`screenVideo`, a new
setting). It pauses when the project closes.

**kh-reuse: closer on the screen, points softer over the film, and a
phone on phones.** The camera comes in on the screen (`view.zoom`,
`view.lift`), and once the film plays the points fade down to a quarter
(`SCREEN_FILM_DIM`). On a phone (under 860px) a 3D phone made in code
(`static/models/phone.glb`) stands in for the laptop, playing the user's
mobile recording (`static/videos/kh-reuse-mobile.mp4`) - a new `phone`
setting.

**kh-reuse's drawer**: year, role, context and text from the user, with a
link to the live demo and a drafted sentence (awaiting approval) on making
it for Knippers Helbig, where they are Head of Digital Technologies. The
drawer's text can now hold links, written `[words](https://...)`.

**kh-reuse: the whole film, filling the window.** The Knippers Helbig
sentence approved. The points now go away altogether once the film plays.
The laptop's and the phone's screens are reshaped to their films' exact
proportions, so nothing is cropped, and the camera comes square-on to the
screen with its edges at the window's (`view.fillScreen`, a new setting).

**kh-reuse's drawer**: a sentence after the tech stack, approved by the
user, on writing both ends from scratch before AI tools were everyday.

**kh-reuse opens in two steps**: the whole laptop (or phone) first, the
points settling on its screen; then, 5s in, the camera moves in on the
screen - stopping short so the device's edges stay in view - and the film
starts, the points fading as it does.

**kh-reuse's close-up a little further back**, framed into the space below
the project's title, so the laptop's or phone's top edge always clears it.

**Names as the user writes them**: the project is "kh ReUse" (its pebble,
title and drawer; the link stays `#kh-reuse`), and the office
"knippershelbig", together, in small letters.
