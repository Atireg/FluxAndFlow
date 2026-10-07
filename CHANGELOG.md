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
- **Docs.** This file, `CLAUDE.md`, and `DECISIONS.md` didn't exist before
  this session; `README.md` existed only as the original TODO list and
  hadn't been touched.

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

## Session 2 — 2026-10-04 / 2026-10-07

`e0c070e`..`4dca501`, then the docs clean-up `b905cbe` and three tweaks after it (branch
`ccr-584d8563-rtv32f`, fast-forward merged to `main` on each "merge and
build"). Every feature below is live and has a DECISIONS.md entry; features
that were tried and removed are listed under "Tried and removed" there.

- **Drawer on the live site.** The About handle was missing because every
  description field was empty (by design - `hasDescription`). Filled with
  unmistakable `[PLACEHOLDER ...]` text to prove the drawer works; the real
  copy is still to come.
- **Catalog motion**, rebuilt as one pure state function per frame (which
  fixed two old hover bugs): a bigger, rocking wander; a continuous
  spotlight - any cube glows orange and jumps, one at a time; the pointer
  stirs nearby cubes like a hand through water; no orbit in the grid.
- **Every cube holds the little rock** (one download, cloned). Clicking an
  empty slot says "Still empty...". No project names on the grid: an
  "Explore me..." tag, "Project XX" labels and falling-leaf names were each
  built and removed.
- **The send-off**: after many iterations (explosion, shake, flux, spin,
  tumble, drift - all disliked), an instant boom knocks the other cubes out
  and up, they hang, then fall slowly and straight off the screen while the
  camera is already moving in.
- **Camera fixes.** The 90° roll on opening/closing is gone at its source
  (the detail camera now looks along the catalog's screen-up; every
  animated move goes through `moveCamera`, which slerps). The closing fade
  no longer pops the grid in at full opacity. The bar title crossfades and
  stays on one line.
- **Project view.** The model turns slowly; the drawer pulls the camera
  into a close-up; double-click / double-tap zooms to a spot and back; a
  soft touch point (orange, later blue) taps twice every 5s to hint at it, until used; a
  grey fog (a CSS layer, not scene fog) rolls in behind the project;
  picture frames in the drawer, empty until the pictures exist.
- **Rock Print.** Its points gather out of a scattered cloud on every open
  (vertex shader, `gather: true`); they're three random inks (dark red,
  orange, grey) in three random sizes, semi-transparent. It lands on its
  own `view` - fitted by mask-overlap scoring to a phone screenshot the user
  supplied, which added `zoom` and `lift` to `view`.
- **Loading.** An inline start-up loader ("flux and flow" particle streams,
  real progress). `?cloudtest` measured ten full clouds at start-up as far
  too heavy, so clouds load only on click.
- **The whole site is paper**: dark ink on a warm light ground, orange for
  invitations. The old dark background was a three.js `Sky` dome (removed);
  additive blending is gone because it draws nothing on paper; scene
  colours go through `screenColor()`.
- **Docs clean-up at the end**: DECISIONS.md regrouped with a contents
  list and a "Tried and removed" section, this entry condensed, README's
  TODO split into open and done, CLAUDE.md given a "where to pick up" and
  testing tips.
- **After the clean-up, three tweaks**: Rock Print's phone view zoomed
  out a touch (stacked zoom 1.9 -> 1.75) since it cropped the pavilion; the
  tap hint is now the floating cubes' blue instead of orange; the spotlit
  cube now eases out of and back into its float (longer, smoothstepped
  fade-out, pose blended with the float) - it used to snap up to 2 units
  in one frame as the jump ended.

Open at end of session (see README, "Next up"):
- The user will supply pictures for Rock Print's three empty drawer frames.
- Rock Print's copy is still placeholder text, live; the role must be stated
  accurately once written.
- Model licensing/attribution for the public .glb is unchecked.
- No per-project URLs; `?cloudtest` and `src/loader/` (dead code) can go.
- Check whether `main` has the branch's last commits (the three tweaks are
  merged only if the user said "merge and build").
