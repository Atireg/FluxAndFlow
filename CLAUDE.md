# Flux and Flow

A portfolio: a catalog of projects explored in three dimensions. Each
project is a glass pebble in a grid (still called a "cube" throughout the
code); clicking one knocks the others off the screen, dissolves it into a
cloud of points and opens the project's 3D model on the whole canvas (a
point cloud, or Emergent Space's solid aggregates dropped with physics),
with its description in a pull-out drawer.

Full project description and TODO list: `README.md`.
Why things are built the way they are: `DECISIONS.md` — read it before
touching the camera/projection math, the fog, the point-cloud asset
pipeline, or the drawer's visibility logic. It exists specifically so those
things don't get re-debugged or re-tried from scratch in a fresh session.
Session-by-session history: `CHANGELOG.md`.

## Where to pick up

Read the last entry of `CHANGELOG.md` (its "Open at end of session" list)
and README's "Next up". As of the end of Session 2:

- **State**: everything built is live, or on the branch -
  `git log origin/main..` shows anything not yet merged.
- **Two projects**: Rock Print Pavilion (slot 0, a scanned point cloud)
  and Emergent Space (slot 1: three copies of an aggregate - a plain mesh,
  `aggregate.glb`, drawn solid in the inks - dropped with live physics onto
  a ground formed by the clicked pebble's points, until they interlock; a
  new drop every time it opens).
- **Catalog**: ten glass pebbles, each a random size on every visit (ones
  that touch push each other apart), slowly changing shape; one at a time
  glows orange with its name hanging on a string in the wind. Behind them
  the start-up loader's flow field drifts on, parting round each pebble
  (index.html, fed by `updateFluxField`).
- **Waiting on the user**: the real copy for both projects (the live drawer
  text is `[PLACEHOLDER ...]`), captions/credits for both projects'
  pictures, model licensing, and a check on real devices that the blind
  Safari fixes work and the physics drop runs smoothly.
- **Not started**: per-project URLs, a landing view; README lists the rest.
- **Before proposing anything**: DECISIONS.md opens with a contents list;
  its "Tried and removed" section lists ideas the user has already seen and
  rejected - don't re-propose them without saying so. The catalog's look
  (pebbles, the orange spotlight, the name hanging on a string in the wind)
  went through many rounds of the user's feedback: tune the existing
  constants before rebuilding any of it.

## Stack and commands

Vanilla three.js + GSAP + Vite, plus cannon-es (physics, loaded on demand
only for Emergent Space's drop - `src/pile.js`). No framework, no test
suite.

    npm install
    npm run dev      # dev server with HMR
    npm run build    # production build into dist/

## Repository and deployment

- GitHub: `Atireg/FluxAndFlow`, public.
- Default branch: `main`. Work happens on feature branches and gets
  fast-forward merged into `main` when ready to publish — `main` is the
  live branch, treat merging into it as a publish action, not a routine step.
  The user asks for it explicitly, usually as "merge and build": merge only
  then, and confirm the deploy afterwards.
- `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every
  push to `main`. A push to `main` goes live in roughly a minute.
- Live at **https://atireg.github.io/FluxAndFlow/**.
- The build works unchanged at a domain root or under a sub-path (e.g. a
  project page) — asset paths resolve via `assetUrl()` against Vite's
  `BASE_URL` rather than being hardcoded absolute. Don't hardcode a leading
  `/` on any asset path; see DECISIONS.md.

## Adding or editing a project

Edit the `projects` array near the top of `src/script.js` (currently ~line
146). Each entry:

```js
{
    id: 'rock-print',
    slot: 0,                                    // fixed grid position, 0-indexed
    title: 'Rock Print Pavilion',
    year: '', role: '', context: '',             // shown in the drawer if non-empty
    body: [],                                     // array of paragraph strings
    credits: '',
    thumbModel: 'models/rock.gltf',               // small model shown in the catalog pebble
    // thumbSize: 1.9,                            // optional: fit thumbModel to this longest side, in the rock's ink (Emergent Space)
    detailModel: 'models/RockPrintStructureReduced.glb',  // loaded on click
    view: { elevation: 58, azimuth: 4, turn: 94,       // optional camera angle, degrees,
            zoom: { stacked: 1.75, side: 1.4 },            // closer than the cube's fit
            lift: { stacked: 0.14, side: 0 },             // raised on screen (share of height)
            sway: 13 },                                    // camera nods ± degrees, slowly
    gather: true,                                 // optional: points gather from a scattered cloud on open
    // points: 20000,                             // optional, a mesh detailModel only: how many points to sample
    // drop: { count: 3, size: 3, ground: -1.2, solid: true }, // optional, a crossed-rod mesh only: copies dropped with physics (Emergent Space)
    images: [{ src: 'images/x.jpg', alt: '', caption: '', ratio: '3 / 2', wide: false }],  // drawer pictures; no src = empty frame
}
```

- The grid always has `SLOT_COUNT` (10) pebbles regardless of viewport; an
  empty slot shows the rock thumbnail (`EMPTY_SLOT_THUMB`) and answers a
  click with "Still empty...". Project count should not exceed
  `SLOT_COUNT` without raising it.
- `title` is also the name that hangs under the pebble when it glows in
  the catalog (an empty slot shows "Project XX"), so keep it short enough
  to fit beside a pebble on a phone - "Rock Print Pavilion" is about the
  longest that does.
- `thumbSize` puts the project's own model in its pebble instead of the
  rock, centred, scaled to that longest side (the pebble is 4.4 across)
  and drawn in the rock's ink whatever its own material; Emergent Space
  uses its `aggregate.glb` at 1.9.
- `images` go in `static/images/`. The first spans the drawer's width, the
  rest sit two to a row. An entry without a `src` renders as an empty
  dashed frame, holding its place until the picture exists. Prepare new
  pictures as Rock Print's were: JPEG quality ~80, progressive, metadata
  stripped (no GPS on a public site), the lead about 1500px wide and the
  rest about 900px - set `ratio` to the file's own width / height. A
  diagram with small text needs `wide: true` (full drawer width, as all of
  Emergent Space's are), at about 1500px across, or 1000px if portrait.
- Leaving `year`/`role`/`context`/`body`/`credits` empty is intentional, not
  a placeholder bug: a project with no description gets no drawer handle at
  all, rather than a handle onto an empty panel. See DECISIONS.md. **State
  the role accurately once written** — the page implies authorship of
  whatever it shows.
- `detailModel` is a `.glb` in `static/models/`: a point cloud (Rock Print) or
  a plain mesh (Emergent Space), whose surface is sampled into points as it
  loads (`MESH_SAMPLE_POINTS`, 20,000, or the project's `points`), centred and
  scaled to fit - see "A mesh becomes points as it loads" in DECISIONS.md
  (Emergent Space samples too, but `drop.solid` draws the mesh itself, so its
  points are never seen). Give a new model a `view` (even just
  `{ elevation: 25 }`): without one the fit is the model's box at the moment
  it opens, and a long shape runs off a phone screen as it turns. If adding
  Draco or quantization to a cloud, read "Quantized, not Draco-compressed"
  first — Draco does not apply to POINTS at all.
- `drop` drops `count` copies of a mesh onto a surface with real physics
  (`src/pile.js`): its collision shape is the straight rods `findRods` finds
  in the mesh, so it only suits rod-built aggregates. `size` is each copy's
  longest side and `ground` the surface's height, in the cube's units (5
  across, centred on 0); `solid` draws them as the mesh itself in the inks
  (`makeInkMaterial`) rather than points. The surface they land on is the
  clicked pebble's dissolve, its points falling into a disc (`uGround` in
  the dissolve shader). They're held hidden for `PILE_WAIT`, then fall into
  view in slow motion (`PILE_TIME_SCALE`); the model turns only once the
  pile has settled. See "Emergent Space: aggregates dropped with live
  physics" in DECISIONS.md before retuning it.

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
  "The default view, and a project's own `view`" in DECISIONS.md).
- **The background is the page's CSS `--bg`, not the scene.** The renderer
  is transparent and there is nothing behind the pebbles (an old `Sky` dome
  that painted a dark night was removed). The ground is light "paper", so
  **don't use additive blending** - it renders as nothing on a light
  background. Give scene colours with `screenColor()`. See DECISIONS.md,
  "The whole site is paper".
- **Scene fog is off** (`scene.fog = null`). The original config had near
  beyond far, which inverts it and made the detail-view cube fog out to the
  background colour. Don't re-enable without reading DECISIONS.md. The
  grey fog in the project view is something else: a CSS layer (`#fog`)
  behind the transparent canvas.
- **The catalog's "cubes" are pebbles.** Names in the code (`cubes`,
  `cubeSize`, `userData.edges`) are the cube-era ones. `userData.edges` is
  a rim mesh (a fresnel-patched MeshBasicMaterial), not edge lines - keep
  driving it through `.material.color` / `.opacity`. A pebble's resting look
  comes from `restingFaceColor` / `restingFaceOpacity` / `restingRimColor`
  (darker once visited) - don't write `cubesColor` back directly. Pebbles
  slowly change shape in the vertex shader (`addPebbleFlux`, on both the
  glass and the rim with the same seed - any new pebble material needs it
  too, or it won't move with them). Each has a random size
  (`cube.userData.size`, `PEBBLE_SIZE_*`) baked into its geometry - never
  into `cube.scale`, which also scales the project's model once it opens;
  anything placed relative to the pebble multiplies by it. See
  DECISIONS.md, "Pebbles, and a clicked one dissolves into points".
- **Faded pebble faces have `depthWrite = false`** while a project is open,
  restored on close. Without this an invisible face still occludes what's
  behind it.
- **`animate()` runs its first frame the moment it's defined**, before the
  rest of `script.js` has executed. Any `const`/`let` it (or anything it
  calls) touches must be declared above it, or the page dies on load with a
  temporal-dead-zone error. This has happened three times.
- **Pebble state is recomputed from mode + clock every frame** (DECISIONS.md,
  "A pebble's state is a pure function"). A GSAP tween on a property
  the per-frame update also writes gets silently overwritten - add a mode or
  keep the per-frame update out of that window instead. The exceptions are
  the effects with memory - the pointer's flow (pebbles bumping each other
  ride on it, `bumpPebbles`) and the tag's rope - integrated in small steps
  (`FLOW_STEP`, `TAG_STEP` for the rope) so they
  behave the same at 5 fps as at 120. Colours go through `paintGlow` (0
  resting, 1 the spotlight's orange). Hover deliberately changes nothing
  visible (DECISIONS.md, "Tried and removed"). The grid's arrival (as the
  loader clears, and back from a project - the pebbles, then their
  contents one by one) is laid over every mode by `applyArrival`: opacity
  and scale, the content's too, are multiplied there after the mode has
  set them, so whatever a mode leaves unset must be reset first or it
  compounds (as 'returning' does for the content's scale).
- **The spotlight's tag hangs on a simulated rope.** `hangSpotlightTag`
  runs a small screen-space Verlet rope (`ROPE_*`) under gravity and a
  gusty `wind(t)`, then draws it as a curve in `#spotlight-string`. Its
  feel lives in the `TAG_*` constants (weight, damping, breeze, gusts,
  how far it may swing); they sit above `animate()` for the TDZ reason
  below. It reads the project's `title` (or "Project XX"); its font size
  follows `--pebble-px` (the pebbles' radius on screen, set by
  `fitCameraToGrid`), not a fixed rem. See DECISIONS.md, "The glowing
  pebble's name hangs on a string".
- **Safari can't be tested here.** Cloud sessions only have Chromium, and
  downloading Playwright's WebKit is blocked. Safari draws WebGL through Metal,
  which is strict where Chrome is lenient: keep GLSL inside defined behaviour
  (no reversed `smoothstep` edges, no `pow(0, y)`), stack HTML over or under
  the canvas by z-index, never page order (the loader's flow field -1, fog 0,
  canvas 1, tags, string and tap hint 2 - at equal z-index Safari drew the
  canvas on top), and don't rely on `click` for taps on the canvas -
  iPhone/iPad Safari doesn't send it there; use `pointerup` on the canvas. See
  DECISIONS.md, "Safari: defined GLSL, visible failures".
- **Moving points have tails** (`addTrails`, `shaders/trail/`): one
  instanced quad per point whose shader re-runs the gather or dissolve a
  moment earlier. They share their points' uniform objects - change how a
  point moves in `pointCloud/gather.glsl` or `DISSOLVE_GLSL` and the tails
  follow; a new motion needs a progress uniform the same way, nothing kept
  from frame to frame. See DECISIONS.md, "Tails behind moving points".
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

Testing tips learnt the hard way:

- **Serve `dist/` gzipped**, as GitHub Pages does, when measuring load
  times; a plain `python -m http.server` overstates transfer sizes. Use
  Playwright's network throttling (CDP `Network.emulateNetworkConditions`)
  for slow-connection checks.
- **Wait for `#loader` to be removed** before clicking anything - it sits
  over the page for at least 5s (`MIN_VISIBLE`) plus its exit - about 6s.
- **Software WebGL is slow** (1-30 fps), and GSAP's lag smoothing then
  stretches tweens to many times their nominal length. Something that looks
  broken or sluggish in a headless screenshot may just be slow rendering;
  log the state/decision rather than trusting timing. For frame-exact
  checks, install Playwright's fake clock (`page.clock.install` /
  `pauseAt` / `runFor`) and grab frames from the canvas
  (`preserveDrawingBuffer` off, so read it inside a `requestAnimationFrame`
  wrapper via `toDataURL`) - `page.screenshot` can hang under a paused
  clock. Sample a grid of pixels, not one: the canvas is transparent.
  Canvas grabs leave out everything drawn in HTML over it (the tags and
  their string, the CSS fog, the touch-point hint, the drawer) - check
  those with a real-time `page.screenshot`.
- **One headless browser at a time.** Two in parallel slowed software
  WebGL enough that a click's boom and camera move hadn't finished 9s
  later, which looked like the click failing. Wait on state - e.g. `#fog`'s
  opacity above 0.9 once a project is open - not on fixed timeouts.
- **Finding a pebble to click**: hover shows nothing, so no label gives a
  pebble away. The grid is row-major and centred; slot 0 sits around
  (310, 185) at 1280x800 and (80, 139) at 390x844, slot 1 one step right
  (~(512, 183) and ~(260, 138)) - near enough despite the float. They move
  if `spacing` or the grid's fit changes, and the pebbles' random sizes
  make every load look different (a big edge pebble shrinks the whole
  grid a little): screenshot the catalog first.
- **Tuning the pile's physics**: don't judge it from a few headless
  screenshots - each drop is random and software rendering plays it in
  slow motion. Run the same cannon-es setup in Node (import
  `node_modules/cannon-es/dist/cannon-es.js`, the rods as cylinders, no
  rendering) a few dozen times per setting and count how often all three
  end up touching; that's how the `PILE_*` values were chosen.
- **Visited pebbles persist** in `localStorage` within a Playwright
  context: open a project and every later page in that context shows its
  pebble darker. Use a fresh context for a clean grid.
- **Fitting a view to a reference screenshot**: make a throwaway build
  (never committed) that freezes the slow rotation, finishes the gather
  instantly and exposes a hook to set `view`; render candidates at the
  screenshot's own CSS viewport and score by mask overlap (IoU) of the
  points' colours. DECISIONS.md, "The default view, and a project's own
  `view`".
- **Editing DECISIONS.md by script**: its contents list repeats every
  entry title, so find an entry by its heading (the title followed by a
  `---` underline), not by the bare title - matching the first occurrence
  once duplicated a long stretch of the file.
- Don't leave debug hooks or `console.log`s in a merge - one shipped to the
  live site once.
