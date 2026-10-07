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

`e0c070e`..(branch head) (branch `ccr-584d8563-rtv32f`, fast-forward merged
to `main` on each "merge and build" - `git log origin/main..` shows anything
not yet live). Every feature below has a DECISIONS.md entry; features that
were tried and removed are listed under "Tried and removed" there.

- **Drawer on the live site.** The About handle was missing because every
  description field was empty (by design - `hasDescription`). Filled with
  unmistakable `[PLACEHOLDER ...]` text to prove the drawer works; the real
  copy is still to come.
- **Catalog motion**, rebuilt as one pure state function per frame (which
  fixed two old hover bugs): a bigger, rocking wander; the pointer stirs
  nearby cubes like a hand through water; no orbit in the grid; a hovered
  cube just tints, no pulse. A continuous spotlight: any cube glows orange
  and jumps, one at a time, its "Project XX" name blinking in step, then
  eases back into its float.
- **Every cube holds the little rock** (one download, cloned). Clicking an
  empty slot says "Still empty...".
- **The send-off**: an instant boom knocks the other cubes out and up, they
  hang, then fall slowly and straight off the screen while the camera is
  already moving in.
- **Camera fixes.** The 90° roll on opening/closing is gone at its source
  (the detail camera now looks along the catalog's screen-up; every animated
  move goes through `moveCamera`, which slerps). The closing fade no longer
  pops the grid in at full opacity. The bar title crossfades and stays on
  one line.
- **Project view.** The model turns slowly; opening the drawer moves the
  model left, whole, on a wide screen and pulls into a close-up on a phone;
  double-click / double-tap zooms to a spot and back, hinted at every 5s by
  a white touch point with a black outline; a grey fog (a CSS layer, not
  scene fog) rolls in behind the project; the drawer holds five pictures of
  Rock Print supplied by the user, sized for the web.
- **Rock Print.** Its points gather out of a scattered cloud on every open
  (vertex shader, `gather: true`); they're three random inks (dark red,
  orange, grey) in three random sizes, semi-transparent. It lands on its own
  `view`, fitted by mask-overlap scoring to a phone screenshot the user
  supplied (which added `zoom` and `lift`), and once gathered the camera
  slowly nods up and down (`view.sway`, 13° either side over 16s).
- **Safari.** Rock Print reportedly didn't load there, and tapping its cube
  did nothing. Selection now answers the canvas's own `pointerup` instead of
  a window `click`, which iPhone/iPad Safari doesn't send for a tap on a
  plain canvas. Fixed blind (no WebKit here), along with spec-defined shader
  code, the fog explicitly under the canvas, and load/shader failures shown
  in the project bar. Still to confirm on a real Safari.
- **Loading.** An inline start-up loader ("flux and flow" particle streams,
  real progress), held for at least 5s with the bar paced to fill over them.
  `?cloudtest` measured ten full clouds at start-up as far too heavy, so
  clouds load only on click.
- **The whole site is paper**: dark ink on a warm light ground, orange for
  invitations. The old dark background was a three.js `Sky` dome (removed);
  additive blending is gone because it draws nothing on paper; scene
  colours go through `screenColor()`.
- **Docs**: DECISIONS.md regrouped with a contents list and a "Tried and
  removed" section (where every rejected iteration of this session is
  listed), README's TODO split into next up / open / done, CLAUDE.md given
  "Where to pick up" and testing tips.

Open at end of session (see README, "Next up"):
- Rock Print's five drawer pictures have no captions or photo credits yet.
- Rock Print on Safari: confirm the blind fix works.
- Rock Print's copy is still placeholder text, live; the role must be stated
  accurately once written.
- Model licensing/attribution for the public .glb is unchecked.
- No per-project URLs; `?cloudtest` and `src/loader/` (dead code) can go.
- A video for the drawer was discussed, not added - see README for the
  agreed approach.
