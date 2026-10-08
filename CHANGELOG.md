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

## Session 2 — 2026-10-04 / 2026-10-08

`e0c070e`..(branch head) on `ccr-584d8563-rtv32f`, fast-forward merged to
`main` on each "merge and build" (`git log origin/main..` shows anything
not yet live). The why is in DECISIONS.md; rejected iterations are under
its "Tried and removed".

- **Catalog.** Cubes became glass pebbles, each its own shape, rebuilt on
  one pure state function per frame: they float and rock, the pointer stirs
  them, nothing orbits, hover just tints. One pebble at a time glows orange
  and jumps, its "Project XX" hanging below on a simulated string. Every
  pebble holds the rock; empty slots say "Still empty...". Opened projects'
  pebbles stay darker, remembered in the browser.
- **Opening a project.** An instant boom, the others fall slowly while the
  camera moves in, and the clicked pebble dissolves into a cloud of points
  that turns into the project's own. Camera moves only tilt (the old 90°
  roll fixed at its source); a grey CSS fog rolls in behind.
- **Rock Print.** Points gather out of a scattered cloud, in three inks and
  sizes; it lands on a view fitted to the user's phone screenshot, turns
  slowly while the camera nods (`view.sway`). Double-click / double-tap
  zoom, hinted by a white touch point. The drawer moves the model left on a
  wide screen, a close-up on a phone, and holds five photos; its text is
  still a placeholder.
- **Site.** "Paper" palette throughout (the dark `Sky` dome removed); an
  inline start-up loader with real progress, at least 5s; clouds load only
  on click after `?cloudtest` measured the alternative.
- **Safari.** Tapping a pebble did nothing there: selection now uses the
  canvas's `pointerup`, not a window `click`. Shaders made spec-defined and
  failures made visible too. Fixed blind; still to confirm.
- **Docs.** DECISIONS regrouped (contents, "Tried and removed") and purged
  to what's current; README's TODO split into next up / open / done;
  CLAUDE.md gained "Where to pick up" and testing tips.

Open at end of session (see README, "Next up"):
- Rock Print on Safari: confirm the fix.
- Rock Print's real copy (live text is placeholder; state the role
  accurately), and captions/credits for its five photos.
- Model licensing/attribution for the public .glb is unchecked.
- A drawer video was discussed, not added - README has the agreed approach.
- No per-project URLs; `?cloudtest` and `src/loader/` (dead code) can go.
