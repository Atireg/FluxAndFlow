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

## Session 2 — 2026-10-04

`e0c070e`..`f96d640`

Follow-up: the About handle was still invisible on the live site after
Session 1. Confirmed `main` and the branch were in sync (they were) - the
actual cause, still, was that every description field on the one live
project was empty, so `hasDescription()` correctly returned false and
rendered no handle at all. Not a deploy problem; a content problem.

- Filled the fields with unmistakable `[PLACEHOLDER ...]` text specifically
  to prove the drawer mechanism works end to end on the live site, and
  verified it with Playwright in both layouts before merging.
- The real copy is still not written. README now says explicitly that the
  live site currently shows placeholder text that needs replacing, not
  just a field that needs filling in for the first time.
