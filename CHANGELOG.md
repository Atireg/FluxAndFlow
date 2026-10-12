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

## Session 3 — 2026-10-11 / 2026-10-12

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

**Emergent Space.**
- The turn starts when the pile looks still, not when cannon sleeps.
- "Drop again" in the bar; drops slow to 40% playback.
- Velocity arrows and live m/s while falling (`drop.velocity`); pulsing
  dots where the aggregates interlock (`drop.contacts`) - graphite, then
  cyan, then blue - shown only once every aggregate is asleep and dropped
  if their sides have parted (they hung in the air before).
- Between drops (`drop.closeUp`): the camera moves in on an interlock,
  following it as the pile turns, for 5s, backs out, the floor slows to a
  stop, and 5s later it drops again, the old pile dissolving away. (First
  a plain repeat every 5s, then 10s.)
- No double-click (`doubleClick: 'none'`).

**Rock Print.**
- Every 10s the camera moves in by itself and back out (`autoZoom`),
  alternately on a point of the pavilion and from inside at eye height
  among the columns, looking along the clearest line between them
  (`eyeLevel`; a wider lens, a closer near plane and a cap on point size
  for it). The camera's nod is slower (22s).
- A double-click holds the pavilion still until the next
  (`doubleClick: 'hold'`).

**Categories.** Projects are research, teaching or the real world
(`category`, required; a tag after the name in the bar). Both projects are
research; the empty slots stand in for four of each other kind. A filter
top left in the catalog brings one kind forward and pushes the other
pebbles back along the camera's line to half their size (straight down
clumped them in the middle); the spotlight stays on the chosen kind, and a
click on a sunk pebble brings its kind forward.

**Tap hint.** "double-click" ("double-tap" on touch) hangs from the dot on
a black, bouncing string - the catalog's rope, shared (`createRope`).

**Docs.** All four brought up to date at the end of the session: names from
the single-file days replaced, misfiled DECISIONS entries moved, this
entry condensed.

Checks were headless (software WebGL, both layouts) with throwaway hooks,
removed before each merge; no console errors in any run.

Open at end of session (see README, "Next up"): Safari still to confirm;
both projects' real copy and picture credits still wanted; Emergent Space's
drop, the streams and Rock Print's inside view unchecked on a real phone;
model licensing unchecked; no per-project URLs. Small: `lil-gui` is a
dependency nothing imports, `smoke.js` is parked, and the JS bundle is one
905 KB chunk Vite warns about.
