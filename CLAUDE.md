# Flux and Flow

A portfolio: a catalog of projects explored in three dimensions. Each
project is a cube in a grid; clicking one opens a split view with the
project's 3D model on one side and its description in a pull-out drawer on
the other.

Full project description and TODO list: `README.md`.
Why things are built the way they are: `DECISIONS.md` — read it before
touching the camera/projection math, the fog, the point-cloud asset
pipeline, or the drawer's visibility logic. It exists specifically so those
things don't get re-debugged or re-tried from scratch in a fresh session.
Session-by-session history: `CHANGELOG.md`.

## Stack and commands

Vanilla three.js + GSAP + Vite. No framework, no test suite.

    npm install
    npm run dev      # dev server with HMR
    npm run build    # production build into dist/

## Repository and deployment

- GitHub: `Atireg/FluxAndFlow`, public.
- Default branch: `main`. Work happens on feature branches and gets
  fast-forward merged into `main` when ready to publish — `main` is the
  live branch, treat merging into it as a publish action, not a routine step.
- `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every
  push to `main`. A push to `main` goes live in roughly a minute.
- Live at **https://atireg.github.io/FluxAndFlow/**.
- The build works unchanged at a domain root or under a sub-path (e.g. a
  project page) — asset paths resolve via `assetUrl()` against Vite's
  `BASE_URL` rather than being hardcoded absolute. Don't hardcode a leading
  `/` on any asset path; see DECISIONS.md.

## Adding or editing a project

Edit the `projects` array near the top of `src/script.js` (currently ~line
75). Each entry:

```js
{
    id: 'rock-print',
    slot: 0,                                    // fixed grid position, 0-indexed
    title: 'Rock Print Pavilion',
    year: '', role: '', context: '',             // shown in the drawer if non-empty
    body: [],                                     // array of paragraph strings
    credits: '',
    thumbModel: 'models/rock.gltf',               // small model shown in the catalog cube
    detailModel: 'models/RockPrintStructureReduced.glb',  // loaded on click
    view: { elevation: 49, azimuth: 4, turn: 145 },     // optional camera angle, degrees
    gather: true,                                 // optional: points gather from a scattered cloud on open
}
```

- The grid always has `SLOT_COUNT` (10) cubes regardless of viewport; an
  empty slot renders as a plain cube. Project count should not exceed
  `SLOT_COUNT` without raising it.
- Leaving `year`/`role`/`context`/`body`/`credits` empty is intentional, not
  a placeholder bug: a project with no description gets no drawer handle at
  all, rather than a handle onto an empty panel. See DECISIONS.md. **State
  the role accurately once written** — the page implies authorship of
  whatever it shows.
- `detailModel` should be a point-cloud `.glb`. If adding Draco compression
  or quantization to a new model, read the "point cloud is quantized, not
  Draco-compressed" entry in DECISIONS.md first — Draco does not apply to
  non-indexed POINTS primitives at all.

## Things that will bite a fresh session

- **The catalog and detail view use different cameras and different fields
  of view** (`CATALOG_FOV = 45`, `DETAIL_FOV = { side: 45, stacked: 30 }`,
  breakpoint at 860px via `SIDE_PANEL_QUERY`). A phone gets a longer lens
  because a wide one shows the cube's top and bottom faces converging at
  once, which reads as a tunnel. Don't unify these without re-checking
  mobile.
- **`DETAIL_MARGIN`** is below 1 on a parked mobile drawer (crops in, to buy
  scale in a width-limited fit) and above 1 once the drawer is open (fit
  becomes height-limited; the same crop would take the cube's top off).
  These two states are not interchangeable — check both before changing
  either. This only governs the square-on default: a project with its own
  `view` is framed on its cube with `VIEW_FRAME_MARGIN` instead (see
  "A project can set its own camera angle" in DECISIONS.md).
- **The background is the page's CSS `--bg`, not the scene.** The renderer
  is transparent and there is nothing behind the cubes (an old `Sky` dome
  that painted a dark night was removed). The ground is light "paper", so
  **don't use additive blending** - it renders as nothing on a light
  background. Give scene colours with `screenColor()`. See DECISIONS.md,
  "The whole site is paper".
- **Scene fog is off** (`scene.fog = null`). The original config had near
  beyond far, which inverts it and made the detail-view cube fog out to the
  background colour. Don't re-enable without reading DECISIONS.md. The
  grey fog in the project view is something else: a CSS layer (`#fog`)
  behind the transparent canvas.
- **Faded cube faces have `depthWrite = false`** while a project is open,
  restored on close. Without this the invisible front face occludes the
  cube's own back edges and the one-point perspective reads as flat.
- **No per-project URLs yet.** The catalog/detail state is not reflected in
  the address bar. Don't assume a project is linkable.

## After every fixed issue

Before moving to the next task, update whichever of these actually
changed - not as a separate pass at the end of the session, but right
after the fix that makes them stale:

- **README.md** — tick the TODO item if one covers it, add one if it
  surfaces something new, correct the note on a partially-done item.
- **DECISIONS.md** — add an entry if the fix involved a reason the code
  alone wouldn't convey (why this approach, what it was chosen over, what
  would have to change to revisit it). Skip it for fixes that are
  self-explanatory from the diff.
- **CHANGELOG.md** — amend the current session's entry to mention it. This
  is not one entry per fix; it stays one entry per session, kept current as
  the session goes. Only start a new entry when a new session begins.

Commit the doc updates together with (or immediately after) the fix itself,
not batched up for later — a fix and its documentation update drifting
apart is exactly the staleness this process exists to prevent.

## Verifying a change

There's no test suite — verification is: build (`npm run build`), serve
`dist/` locally, and drive it with Playwright (headless Chromium is
pre-installed in cloud sessions; `--use-gl=angle --use-angle=swiftshader`
for software WebGL). Screenshot before/after rather than trusting a visual
change from reading the diff. Check both the `side` (≥860px) and `stacked`
(<860px) layouts, and both drawer states (open/parked) on mobile — several
real bugs in this project only showed up in one specific combination of
layout × drawer state × view (catalog vs. detail).
