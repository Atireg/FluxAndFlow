# Flux and Flow

A portfolio: a catalog of projects explored in three dimensions. Each
project is a graphite pebble in a grid (still called a "cube" throughout
the code); clicking one knocks the others off the screen, dissolves it into
a cloud of points and opens the project's 3D model on the whole canvas (a
point cloud, or Emergent Space's solid aggregates dropped with physics),
with its description in a pull-out drawer.

- `README.md` - the project and its TODO list.
- `DECISIONS.md` - why things are built the way they are. Read the
  relevant entry before touching the camera/projection math, the fog, the
  point-cloud pipeline, the pebbles or the drawer; it exists so those
  aren't re-debugged or re-tried from scratch. It opens with a contents
  list, and ends with "Tried and removed": ideas the user has seen and
  rejected - don't re-propose them without saying so.
- `CHANGELOG.md` - session by session.

## Where to pick up

Read the last entry of `CHANGELOG.md` (its "Open at end of session" list)
and README's "Next up". As of the end of Session 2:

- **State**: everything built is live, or on the branch - `git log
  origin/main..` shows anything not yet merged.
- **Catalog**: ten pebbles shaded in graphite, each a random size on every
  visit, slowly changing shape, pushing apart where they touch; one at a
  time glows orange with its name hanging on a string in the wind. The
  grid arrives slowly as the loader clears, the pebbles' contents one by
  one, and the loader's streams carry on among them in the scene.
- **Two projects**: Rock Print Pavilion (slot 0, a scanned point cloud
  that gathers out of a scattered cloud) and Emergent Space (slot 1: three
  copies of a plain mesh, `aggregate.glb`, drawn solid in the inks and
  dropped with live physics onto a ground of the clicked pebble's points
  until they interlock - a new drop every time). Moving points have tails.
- **Waiting on the user**: the real copy for both projects (the live drawer
  text is `[PLACEHOLDER ...]`), captions/credits for both projects'
  pictures, model licensing, and checks on real devices (the blind Safari
  fixes, the physics drop, the streams' strength on a phone).
- **Not started**: per-project URLs, a landing view; README lists the rest.

## Working with the user

- **Publishing**: merge into `main` only when asked - usually "merge and
  build" - then confirm the deploy (below). Otherwise commit and push to
  the working branch and say it isn't live yet.
- **Keep turns short.** Make the change, build, check for errors, push.
  Long headless verification runs (fake clocks, frame grabs) have been too
  slow for the user; when they say "don't render it", don't.
- **No screenshots in replies** - the user looks at the live site.
- **Wording**: "project view" has sometimes meant the catalog of pebbles.
  When a request names something that only exists in one view, read it as
  that view, and say how it was read.
- **Look and feel** went through many rounds of feedback (the pebbles, the
  orange spotlight, the name on a string, the arrival, the streams): tune
  the existing constants before rebuilding any of it.
- Placeholder project text stays obviously fake: the real copy and the
  role come from the user, because the page implies authorship.

## Stack and commands

Vanilla three.js + GSAP + Vite, plus cannon-es (physics, loaded on demand
only for Emergent Space's drop - `src/pile.js`). No framework, no test
suite.

    npm install
    npm run dev      # dev server with HMR
    npm run build    # production build into dist/

Main files: `src/script.js` (nearly everything), `src/pile.js` (the
physics drop), `src/streams.js` (the catalog's streams), `src/index.html`
(the inline start-up loader), `src/shaders/` (point cloud, gather, tails).

## Repository and deployment

- GitHub `Atireg/FluxAndFlow`, public. `main` is the live branch: work
  happens on a feature branch and is fast-forward merged into `main` to
  publish.
- `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every
  push to `main` - live in about a minute at
  **https://atireg.github.io/FluxAndFlow/**. Confirm with the latest
  workflow run on `main`.
- The build works at a domain root or under a sub-path: asset paths
  resolve via `assetUrl()` against Vite's `BASE_URL`. Never hardcode a
  leading `/` on an asset path.

## Adding or editing a project

Edit the `projects` array near the top of `src/script.js` (~line 146):

```js
{
    id: 'rock-print',
    slot: 0,                                    // fixed grid position, 0-indexed
    title: 'Rock Print Pavilion',
    year: '', role: '', context: '',             // shown in the drawer if non-empty
    body: [],                                     // array of paragraph strings
    credits: '',
    thumbModel: 'models/rock.gltf',               // small model shown in the catalog pebble
    // thumbSize: 1.9,                            // optional: fit thumbModel to this longest side (Emergent Space)
    detailModel: 'models/RockPrintStructureReduced.glb',  // loaded on click
    view: { elevation: 58, azimuth: 4, turn: 94,       // optional camera angle, degrees,
            zoom: { stacked: 1.75, side: 1.4 },            // closer than the cube's fit
            lift: { stacked: 0.14, side: 0 },             // raised on screen (share of height)
            sway: 13 },                                    // camera nods ± degrees, slowly
    gather: true,                                 // optional: points gather from a scattered cloud on open
    // points: 20000,                             // optional, a mesh detailModel only: how many points to sample
    // drop: { count: 3, size: 3, ground: -1.2, solid: true }, // optional, a crossed-rod mesh only (Emergent Space)
    images: [{ src: 'images/x.jpg', alt: '', caption: '', ratio: '3 / 2', wide: false }],  // drawer pictures; no src = empty frame
}
```

- **Slots**: the grid always has `SLOT_COUNT` (10) pebbles; an empty slot
  shows the rock (`EMPTY_SLOT_THUMB`) and answers a click with "Still
  empty...". Raise `SLOT_COUNT` before adding an eleventh project.
- **`title`** is also the name that hangs under the glowing pebble, so keep
  it short enough for a phone - "Rock Print Pavilion" is about the longest.
- **`thumbSize`** puts the project's own model in its pebble instead of the
  rock, scaled to that longest side (the pebble is 4.4 across at size 1).
  Every thumbnail is drawn in graphite (`THUMB_INK`).
- **Text fields** left empty are intentional: a project with no description
  gets no drawer handle at all. **State the role accurately** once written.
- **`images`** go in `static/images/`. The first spans the drawer, the rest
  sit two to a row unless `wide: true` (diagrams with small text - all of
  Emergent Space's). No `src` = an empty dashed frame. Prepare as JPEG
  quality ~80, progressive, metadata stripped (no GPS on a public site);
  about 1500px across for a lead or a wide one (1000px if portrait), 900px
  otherwise; `ratio` is the file's own width / height.
- **`detailModel`** is a `.glb` in `static/models/`: a point cloud, or a
  plain mesh sampled into points as it loads (`MESH_SAMPLE_POINTS`, 20,000,
  or `points`), centred and scaled to fit. Give a new model a `view` (even
  just `{ elevation: 25 }`), or a long shape runs off a phone screen as it
  turns. Before adding Draco or quantization to a cloud, read "Quantized,
  not Draco-compressed" - Draco does not apply to POINTS.
- **`drop`** drops `count` copies of a mesh with real physics
  (`src/pile.js`), colliding as the straight rods `findRods` finds - so only
  rod-built aggregates. `size` is each copy's longest side, `ground` the
  surface's height (cube units: 5 across, centred on 0); `solid` draws the
  mesh itself (`makeInkMaterial`). The surface is the clicked pebble's
  dissolve falling into a disc (`uGround`). They're held hidden for
  `PILE_WAIT`, fall in slow motion (`PILE_TIME_SCALE`), and the model turns
  once settled. Read "Emergent Space: aggregates dropped with live physics"
  before retuning; tune it in Node (testing tips).

## Things that will bite a fresh session

- **`animate()` runs its first frame the moment it's defined**, before the
  rest of `script.js` has executed. Any `const`/`let` it - or anything it
  calls - touches must be declared above it, or the page dies on load with
  a temporal-dead-zone error. This has happened three times.
- **A pebble's state is recomputed from mode + clock every frame**
  ("A pebble's state is a pure function"). A GSAP tween on a property the
  per-frame update also writes is silently overwritten - add a mode, or
  keep the update out of that window. Colours go through `paintGlow` (0
  resting, 1 the spotlight's orange); hover deliberately changes nothing.
  - Exceptions, with memory, integrated in fixed small steps so they behave
    the same at 5 fps as at 120: the pointer's flow, which the pebbles'
    bumps ride on (`bumpPebbles`, `FLOW_STEP`), and the tag's rope
    (`TAG_STEP`).
  - The arrival (as the loader clears, and back from a project) is laid
    over every mode by `applyArrival`, multiplying opacity and scale -
    the content's too - after the mode has set them. Whatever a mode
    leaves unset must be reset first or it compounds ('returning' resets
    the content's scale).
- **The catalog's "cubes" are pebbles.** Names in the code (`cubes`,
  `cubeSize`, `userData.edges`) are cube-era. `userData.edges` is a rim
  mesh (fresnel-patched MeshBasicMaterial) - drive it through
  `.material.color` / `.opacity`. The face is a graphite shade
  (`addGraphite`), not lit glass: its colour is the graphite, its emissive
  the spotlight's orange, its opacity how heavily it's shaded. Resting
  looks come from `restingFaceColor` / `restingFaceOpacity` /
  `restingRimColor` (darker once visited) - never write `cubesColor` back
  directly.
  - Pebbles change shape in the vertex shader (`addPebbleFlux`, face and
    rim on the same seed - any new pebble material needs it too).
  - Each pebble's random size (`cube.userData.size`, `PEBBLE_SIZE_*`) is
    baked into its geometry, never `cube.scale`: the pebble parents the
    project's model once it opens. Anything placed relative to a pebble
    multiplies by its size.
- **Pebble faces write depth only when visible**: `depthWrite = false`
  while a project is open (restored on close) and while still arriving
  (`applyArrival`). An invisible face would otherwise occlude what's
  behind it - the streams draw after the pebbles, depth-tested, so a
  pebble hides what passes under it, and would show holes.
- **The streams** (`src/streams.js`) live in the scene on the y = 0 plane,
  parting round each pebble's circle in the scene; they fade out while a
  project is open. The loader's own 2D canvas (index.html) only runs until
  the loader leaves, announced by the `fluxloader:leaving` event, which
  also starts the arrival.
- **Moving points have tails** (`addTrails`, `shaders/trail/`): an
  instanced quad per point whose shader re-runs the gather or dissolve a
  moment earlier, sharing its points' uniform objects. Change how a point
  moves in `pointCloud/gather.glsl` or `DISSOLVE_GLSL` and the tails
  follow.
- **The spotlight's tag hangs on a simulated rope**: `hangSpotlightTag`, a
  screen-space Verlet rope (`ROPE_*`) under gravity and a gusty `wind(t)`,
  drawn into `#spotlight-string`. Its feel lives in the `TAG_*` constants
  (above `animate()`, for the TDZ reason). Its font size follows
  `--pebble-px` (set by `fitCameraToGrid`), not a fixed rem.
- **Two cameras, two fields of view**: `CATALOG_FOV = 45`,
  `DETAIL_FOV = { side: 45, stacked: 30 }`, breakpoint 860px
  (`SIDE_PANEL_QUERY`). A phone gets the longer lens because a wide one
  makes the cube's faces converge like a tunnel.
- **`DETAIL_MARGIN`** is below 1 on a parked phone drawer and above 1 once
  it's open - not interchangeable; check both. It only governs the
  square-on default; a project with a `view` uses `VIEW_FRAME_MARGIN`.
- **The background is the page's CSS `--bg`** ("paper"), not the scene: the
  renderer is transparent. **No additive blending** - it draws nothing on
  paper. Give scene colours with `screenColor()`.
- **Scene fog is off** (`scene.fog = null`; the original config was
  inverted). The grey fog in the project view is a CSS layer (`#fog`)
  behind the transparent canvas.
- **Safari can't be tested here** (Chromium only; WebKit's download is
  blocked). Safari's WebGL runs on Metal, strict where Chrome is lenient:
  keep GLSL inside defined behaviour (no reversed `smoothstep` edges, no
  `pow(0, y)`); stack HTML by z-index, never page order (fog 0, canvas 1,
  tags, string and tap hint 2); and use `pointerup` on the canvas, not
  `click` - iPhone/iPad Safari doesn't send it there.
- **No per-project URLs yet** - don't assume a project is linkable.

## After every fixed issue

Update whichever of these the fix made stale, and commit them with the fix
(not batched up for later):

- **README.md** - tick the TODO item, add one if something new surfaced,
  correct a partially-done note.
- **DECISIONS.md** - an entry when the reason isn't in the code (why this,
  over what, what would have to change to revisit it). Rejected looks go
  under "Tried and removed".
- **CHANGELOG.md** - amend the current session's entry; one entry per
  session, kept current as it goes.
- **CLAUDE.md** - when the state, a gotcha or the way the user works
  changes.

## Verifying a change

Build (`npm run build`), serve `dist/` (gzipped, as Pages does), and drive
it with Playwright: headless Chromium is pre-installed
(`--use-gl=angle --use-angle=swiftshader` for software WebGL). Check both
layouts - `side` (≥860px) and `stacked` (<860px) - and both drawer states
on a phone when touching layout: several bugs only showed in one
combination of layout × drawer × view. Keep it proportionate (see
"Working with the user").

Testing tips learnt the hard way:

- **Wait for `#loader` to be removed** before clicking - at least 5s
  (`MIN_VISIBLE`) plus its 2.6s exit.
- **Software WebGL is slow** (1-30 fps) and GSAP's lag smoothing stretches
  tweens: something sluggish in a headless run may just be slow rendering.
  Log the state rather than trusting timing. For frame-exact checks use
  Playwright's fake clock and grab the canvas inside a
  `requestAnimationFrame` wrapper via `toDataURL` (it leaves out the HTML
  overlays) - slow, so only when it matters.
- **One headless browser at a time**: two in parallel slowed software
  WebGL enough to look like a failed click. Wait on state (e.g. `#fog`'s
  opacity above 0.9 once a project is open), not fixed timeouts.
- **Finding a pebble to click**: slot 0 sits around (310, 185) at
  1280x800 and (80, 139) at 390x844, slot 1 one step right - but random
  sizes and the bumps shift them every load; screenshot the catalog first
  (for yourself, not the user).
- **Tuning the pile's physics**: run the same cannon-es setup in Node
  (`node_modules/cannon-es/dist/cannon-es.js`, rods as cylinders, no
  rendering) a few dozen times per setting and count how often all three
  end up touching - that's how `PILE_*` was chosen.
- **Visited pebbles persist** in `localStorage` within a Playwright
  context; use a fresh context for a clean grid.
- **Fitting a view to a reference screenshot**: a throwaway build (never
  committed) that freezes the turn, finishes the gather and exposes a hook
  to set `view`; score candidates by mask overlap (IoU). See "The default
  view, and a project's own `view`".
- **Editing DECISIONS.md by script**: its contents list repeats every
  title, so find an entry by its heading (title plus `---` underline).
- **No debug hooks or `console.log`s** in a merge - one shipped once.
