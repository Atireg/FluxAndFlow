# Flux and Flow

A portfolio: a catalog of projects explored in three dimensions. Each
project is a graphite pebble in a grid (a "cube" in a few cube-era names
- `CUBE_SIZE`, `.cube-tag`); clicking one knocks the others off the screen, dissolves it into
a cloud of points and opens the project's 3D model on the whole canvas (a
point cloud, or Emergent Space's solid aggregates dropped with physics),
with its description in a pull-out drawer.

- `README.md` - the project and its TODO list.
- `src/` is React (the page) + `src/engine/` (the canvas) + `src/projects/`
  (the content). See "Stack and commands" below.
- `DECISIONS.md` - why things are built the way they are. Read the
  relevant entry before touching the camera/projection math, the fog, the
  point-cloud pipeline, the pebbles or the drawer; it exists so those
  aren't re-debugged or re-tried from scratch. It opens with a contents
  list, and ends with "Tried and removed": ideas the user has seen and
  rejected - don't re-propose them without saying so.
- `CHANGELOG.md` - session by session.

## Where to pick up

Read the last entry of `CHANGELOG.md` (its "Open at end of session" list)
and README's "Next up". As of the end of Session 3:

- **State**: everything built is live - `git log origin/main..` shows
  anything not yet merged.
- **Categories**: every project is research, teaching or the real world
  (`category`, a tag in its bar); a filter top left in the catalog brings
  one kind forward and pushes the rest back to half size, fainter; only that kind
  jumps orange while it's chosen. Both projects are
  research; the empty slots stand in for 4 teaching, 4 real world.
- **Catalog**: ten pebbles shaded in graphite, each a random size on every
  visit, slowly changing shape and warmth, pushing apart where they touch;
  one at a time glows orange with its name hanging on a string in the
  wind. The grid arrives slowly as the loader clears, and the loader's
  streams carry on among the pebbles in the scene.
- **Rock Print Pavilion** (slot 0): a scanned point cloud that gathers out
  of a scattered cloud, turns, and nods. Every 10s the camera moves in by
  itself, then out - alternately on a point of the pavilion and from
  inside, at eye height among the columns (`autoZoom`, `eyeLevel`). A
  double-click holds it still until the next (`doubleClick: 'hold'`).
- **Emergent Space** (slot 1): three solid aggregates dropped with live
  physics onto a ground of the clicked pebble's points, a new drop each
  time; velocity arrows while they fall, blue dots where they interlock
  once at rest, then the camera closes in on one interlock, backs out, the
  floor slows to a stop and it drops again (`drop.closeUp`). No
  double-click (`doubleClick: 'none'`).
- **Waiting on the user**: the real copy for both projects (the live drawer
  text is `[PLACEHOLDER ...]`), captions/credits for the pictures, model
  licensing, and checks on real devices (the blind Safari fixes, the
  physics drop, the streams on a phone, the inside view on a phone).
- **Landing page**: the first thing on opening is three short paragraphs -
  hidden currents, the user's background, the services (the user's own
  words, worked out line by line: change them only on request) - over the loader's floating
  particles (it scrolls on a small phone), with "Welcome to the F&F
  playground" - which turns it into the loader and on to the catalog. The back link in a
  project reads "F&F playground".
- **Not started**: per-project URLs, a way back to the landing page;
  README lists the rest.

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
- **Requests come in quick succession**, often several in one message or
  mid-turn, each a small look-and-feel step on what was just built. Do
  them in order, as project settings where they're per project, and say
  in one line how an ambiguous one was read.
- **Look and feel** went through many rounds of feedback (the pebbles, the
  orange spotlight, the name on a string, the arrival, the streams): tune
  the existing constants before rebuilding any of it.
- Placeholder project text stays obviously fake: the real copy and the
  role come from the user, because the page implies authorship.

## Stack and commands

React + three.js + GSAP + Vite, plus cannon-es (physics, loaded on demand
only for Emergent Space's drop - `src/engine/pile.js`). No test suite.

    npm install
    npm run dev      # dev server with HMR
    npm run build    # production build into dist/

React owns the page; the engine owns the canvas. Read "React owns the page;
the engine owns the canvas" in DECISIONS.md before moving anything across
that line.

    src/index.html          the landing page + start-up loader (inline), and #root. Nothing else
    src/main.jsx            mounts <App/> (no StrictMode - see the file)
    src/app/App.jsx         the page: React state, the refs, the `ui` bridge
    src/components/         ProjectBar, ProjectDrawer, ProjectImage,
                            CatalogTags, CategoryFilter, HintTag, TapHint, Fog
    src/projects/           the content: one module per project + schema.js
    src/engine/             the canvas - index.js assembles and runs it
    src/styles.css          all of it, unchanged

Inside `src/engine/`:

    index.js             createEngine(): builds everything, the render loop, input
    state.js             the shared mutable state (what were top-level `let`s)
    constants.js         the few cross-cutting numbers; its header maps the rest
    colors.js            screenColor() and every scene colour
    assets.js            assetUrl() and the gltf/texture loaders
    boot.js              start-up progress, reported to the inline loader
    visited.js           which projects have been opened (localStorage)
    layout.js            the side/stacked breakpoint and the drawer's share
    catalog.js           the grid of pebbles, thumbnails, the idle/spotlight modes
    detail.js            opening and closing a project, double-click, the timed zooms
                         and close-ups, the tap hint
    tags.js              the names, their rope, the tap hint's string, "Still empty...", in screen pixels
    streams.js           the streams themselves
    streams-view.js      wiring them to the pebbles, the camera and the pointer
    pile.js              the physics drop
    smoke.js             parked, not in the scene - see the file
    pebbles/             geometry, materials, wander, flow, arrival, spotlight,
                         dissolve, drop, gradient (the face's drifting warmth),
                         focus (the filter's sinking of the other kinds)
    pointcloud/          load, mesh sampling, gather, trails
    camera/              rig (cameras, controls, renderer), framing (where it goes),
                         inside (a spot at eye level inside a model)
    shaders/             point cloud, gather, tails, smoke

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

Two steps, and nothing else:

1. write `src/projects/<id>.js`, exporting `defineProject({ ... })`
2. add it to the `catalog` array in `src/projects/index.js`

There is **no per-project branch anywhere in the engine**: a project that
wants to behave differently says so through `view`, `gather`, `drop`,
`points`, `thumbSize`, `doubleClick`, `autoZoom` or `eyeLevel`, and the one code path reads it. `defineProject`
(in `src/projects/schema.js`) fills the defaults, normalises the pictures
and throws on a missing `detailModel`, a slot outside `SLOT_COUNT`, a
`body` that isn't an array, or two projects claiming one slot. Copy
`rock-print.js` as the worked example.

```js
defineProject({
    id: 'rock-print',
    slot: 0,                                    // fixed grid position, 0-indexed
    title: 'Rock Print Pavilion',
    category: 'research',                       // 'research', 'teaching' or 'real-world' - required
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
    doubleClick: 'hold',                          // optional: 'zoom' (default), 'hold' (stop the turn till the next), 'none'
    autoZoom: 10,                                 // optional: camera moves in on a point / back out every 10s (not with `drop`)
    eyeLevel: 0.4,                                // optional, with autoZoom: every other move in is from inside, at this share of the height
    // drop: { count: 3, size: 3, ground: -1.2, solid: true,   // optional, a crossed-rod mesh only (Emergent Space)
    //         contacts: true, closeUp: { hold: 5, after: 5 },   // interlock dots; camera in on one 5s, out, drop 5s later
    //         velocity: true },                                  // live velocity (or `repeat: 10`: drop again 10s after rest)
    images: [{ src: 'images/x.jpg', alt: '', caption: '', ratio: '3 / 2', wide: false }],  // drawer pictures; no src = empty frame
})
```

- **Slots**: the grid always has `SLOT_COUNT` (10) pebbles; an empty slot
  shows the rock (`EMPTY_SLOT_THUMB`) and answers a click with "Still
  empty...". Both live in `src/projects/schema.js`; raise `SLOT_COUNT`
  before adding an eleventh project.
- The engine never imports `src/projects/`: it is handed `catalogSource`
  (slot count, what sits in each slot, the empty thumbnail, how to label a
  pebble). Keep it that way - the engine shouldn't know this portfolio's
  content.
- **`category`** tags the project (after its name in the bar) and is what
  the catalog's filter brings forward. Empty slots stand in for the other
  kinds (`EMPTY_SLOT_CATEGORIES` in `schema.js`) - take a slot out of that
  map once a real project fills it.
- **`title`** is also the name that hangs under the glowing pebble, so keep
  it short enough for a phone - "Rock Print Pavilion" is about the longest.
- **`thumbSize`** puts the project's own model in its pebble instead of the
  rock, scaled to that longest side (the pebble is 4.4 across at size 1).
  Every thumbnail is drawn in graphite (`THUMB_INK`).
- **Text fields** left empty are intentional: a project with no description
  gets no drawer handle at all. **State the role accurately** once written.
- **`images`** go in `static/images/` and are rendered by
  `components/ProjectImage.jsx`. The first spans the drawer, the rest
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
  (`src/engine/pile.js`), colliding as the straight rods `findRods` finds - so only
  rod-built aggregates. `size` is each copy's longest side, `ground` the
  surface's height (cube units: 5 across, centred on 0); `solid` draws the
  mesh itself (`makeInkMaterial`). The surface is the clicked pebble's
  dissolve falling into a disc (`uGround`). They're held hidden for
  `PILE_WAIT`, fall in slow motion (`PILE_TIME_SCALE`), and the model turns
  once they look still (`PILE_REST_*` - not cannon's sleep, which lags by a
  second; the physics runs on until it does sleep). The bar's "Drop again"
  (any project with a `drop`) restarts it at the angle it had reached
  (`turnOffset`, `modelTurn`), and `drop.repeat` does the same that many
  seconds after each drop comes to rest - the old pile dissolving away
  first (`pile.replay`, `uFade` in `makeInkMaterial`). Emergent Space uses
  `drop.closeUp` instead: the camera moves in on one interlock, follows it
  as the pile turns for `hold` s, moves out, and drops again `after` s
  later (`runCloseUp` in `detail.js`).
  `drop.contacts` pulses dots at the crossings (cannon's own contacts);
  `drop.velocity` shows each aggregate's velocity as an arrow and a live
  m/s tag (HTML via refs, `detail.updateVelocityTags`). Read "Emergent Space: aggregates dropped with live physics"
  before retuning; tune it in Node (testing tips).

## Things that will bite a fresh session

- **The temporal-dead-zone trap is gone.** `animate()` used to run its
  first frame the moment it was defined, so anything it touched had to be
  declared above it; it bit three times, and it is why constants used to be
  hoisted to the top of the file. Nothing now runs until
  `engine.start()`, so declaration order is free and constants live beside
  the code they tune. Don't re-introduce work at module scope in
  `src/engine/`.
- **Per-frame HTML must not go through React state.** The pebbles' names,
  the string, "Still empty..." and the tap hint move every frame: React
  renders the elements and the engine writes their `style`/`d` through refs
  (`ui.overlays`, `ui.showTapHint`). React state is only for what changes
  on a click - the open project, the bar's status, the drawer.
- **A pebble's state is recomputed from mode + clock every frame**
  ("A pebble's state is a pure function", `engine/catalog.js`). A GSAP
  tween on a property the per-frame update also writes is silently
  overwritten - add a mode, or keep the update out of that window. Colours go through `paintGlow` (0
  resting, 1 the spotlight's orange); hover deliberately changes nothing.
  - Exceptions, with memory, integrated in fixed small steps so they behave
    the same at 5 fps as at 120: the pointer's flow, which the pebbles'
    bumps ride on (`bumpPebbles`, `FLOW_STEP`), and the tag's rope
    (`TAG_STEP`).
  - The filter's sink (`applyFocus`, `pebbles/focus.js`) is laid over
    every mode after the arrival, pushing the other kinds back along the
    camera's line; a click on a sunk pebble brings its kind forward
    (`ui.onFocus` tells React) instead of opening it.
  - The arrival (as the loader clears, and back from a project) is laid
    over every mode by `applyArrival`, multiplying opacity and scale -
    the content's too - after the mode has set them. Whatever a mode
    leaves unset must be reset first or it compounds ('returning' resets
    the content's scale).
- **The catalog's "cubes" are pebbles.** The code now says `pebble`
  throughout, but the grid unit is still `CUBE_SIZE` and the rim is still
  `userData.edges` - both cube-era, and the CSS classes
  (`.cube-tag`) are too. `userData.edges` is a rim
  mesh (fresnel-patched MeshBasicMaterial) - drive it through
  `.material.color` / `.opacity`. The face is a graphite shade
  (`addGraphite`), not lit glass: its colour is the graphite, its emissive
  the spotlight's orange, its opacity how heavily it's shaded. Resting
  looks come from `restingFaceColor` / `restingFaceOpacity` /
  `restingRimColor` (darker once visited) - never write a resting colour
  back directly.
  - Pebbles change shape in the vertex shader (`addPebbleFlux`, face and
    rim on the same seed - any new pebble material needs it too). It also
    sends `vPebbleFlux` on to the fragment shader, for the face's warmth to
    drift with.
  - **A pebble's tone is in its alpha, not its colour.** `addGraphite` sets
    `outgoingLight` to one flat colour and varies `diffuseColor.a` - how
    heavily it's laid down on the paper. That's what makes it read as
    pencil. So changing a pebble's colour (see `pebbles/gradient.js`) leaves
    the shading alone, and vice versa.
  - **The face's colour is a multiplier, never a colour to mix to**
    (`pebbles/gradient.js`): each pebble's warmth drifts with its own flux,
    carried as a ratio against the resting graphite. `paintGlow` dims the
    face to a tenth as the spotlight's orange rises, and a visited pebble
    rests darker - an absolute `mix()` ignores both and put a brown back
    over the glow. Don't add orange or teal here: one orange means "click
    me", and "the blue isn't right".
  - Each pebble's random size (`cube.userData.size`, `PEBBLE_SIZE_*`) is
    baked into its geometry, never `cube.scale`: the pebble parents the
    project's model once it opens. Anything placed relative to a pebble
    multiplies by its size.
- **Pebble faces write depth only when visible**: `depthWrite = false`
  while a project is open (restored on close) and while still arriving
  (`applyArrival`). An invisible face would otherwise occlude what's
  behind it - the streams draw after the pebbles, depth-tested, so a
  pebble hides what passes under it, and would show holes.
- **The streams** (`src/engine/streams.js`, wired up in `streams-view.js`)
  live in the scene on the y = 0 plane,
  parting round each pebble's circle in the scene and drifting towards the
  pointer while the mouse moves or a finger is down (`trackPointer` in
  `streams-view.js`, `PULL_*`); they fade out while a project is open. The loader's own 2D canvas
  (index.html), behind the landing page and then the loader, only runs until the loader leaves, announced by the
  `fluxloader:leaving` event, which also starts the arrival.
- **The cloud loader re-skins every `Points` in a model** (`pointcloud/
  load.js` gives each the point-cloud shader). Anything else drawn as
  points inside a model - the pile's interlocking dots - must set
  `userData.ownMaterial`, or its uniforms vanish and it throws every frame.
- **Moving points have tails** (`pointcloud/trails.js`,
  `shaders/trail/`): an
  instanced quad per point whose shader re-runs the gather or dissolve a
  moment earlier, sharing its points' uniform objects. Change how a point
  moves in `shaders/pointCloud/gather.glsl` or `DISSOLVE_GLSL`
  (`pebbles/dissolve.js`) and the tails follow.
- **The spotlight's tag hangs on a simulated rope**: `hangSpotlightTag` in
  `engine/tags.js`, a screen-space Verlet rope (`ROPE_*`) under gravity and
  a gusty `wind(t)`, drawn into the SVG `CatalogTags` renders. Its feel
  lives in that file's `TAG_*` constants. Its font size follows
  `--pebble-px` (set by `framing.fitToGrid`), not a fixed rem. The rope
  itself is `createRope`/`drawRope`, shared with the tap hint's elastic
  string and "double-click" (`HINT_*`, `HintTag.jsx`), which
  times itself to the dot's CSS animation - change `tap-hint-life`/
  `-press` and `HINT_LIFE`/`HINT_TAPS` together. The hint's tag also
  carries `.cube-tag--spotlight` (for its look), so it's rendered after
  `CatalogTags`: `querySelector('.cube-tag--spotlight')` and
  `.tag-string__knot` still find the catalog's first.
- **The camera's moves in the project view all go through `moveCamera`**
  (`camera/rig.js`), and the automatic ones follow what they moved in on
  as the model turns (`follow`, `worldAhead` in `detail.js`): aim where it
  will be when the camera arrives, then translate with it. The model's
  turn is `modelTurn` (`camera/framing.js`) - a pile's waits for it to
  settle and slows to a stop before a new drop (`pile.turnStop`), and a
  held model's subtracts the time held (`model.userData.held`). Standing
  inside (`eyeLevel`) lowers the camera's near plane (`rig.baseNear` is
  the usual one) and widens the lens; points by the camera draw at their
  world size, uncapped (asked for).
- **Two cameras, two fields of view** (`camera/rig.js`):
  `CATALOG_FOV = 45`, `DETAIL_FOV = { side: 45, stacked: 30 }`, breakpoint
  860px (`SIDE_PANEL_QUERY` in `engine/layout.js`). A phone gets the longer lens because a wide one
  makes the cube's faces converge like a tunnel.
- **`DETAIL_MARGIN`** (`camera/framing.js`) is below 1 on a parked phone
  drawer and above 1 once
  it's open - not interchangeable; check both. It only governs the
  square-on default; a project with a `view` uses `VIEW_FRAME_MARGIN`.
- **The background is the page's CSS `--bg`** ("paper"), not the scene: the
  renderer is transparent. **No additive blending** - it draws nothing on
  paper. Give scene colours with `screenColor()`.
- **Scene fog is off** (`scene.fog = null` in `engine/index.js`; the
  original config was inverted). The grey fog in the project view is a CSS
  layer (`components/Fog.jsx`) behind the transparent canvas, toggled
  through `ui.onFog`.
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

- **Click `#loader-enter` ("Welcome to the F&F playground"), then wait for `#loader` to
  be removed** before clicking anything else - the landing page waits for
  that click, then at least 5s (`MIN_VISIBLE`, counted from the click) plus
  its 2.6s exit. Without the click the loader never leaves.
- **Measure the page, not the canvas, for anything about colour.** Reading
  the WebGL canvas and unpremultiplying it recovers the INK's colour however
  faintly it is laid down - the pebbles sit at about 0.27 alpha over paper,
  so a large ink change can be an invisible screen change. This reported a
  pebble colour change as clearly visible when it could not be seen at all.
  Use `page.screenshot()`, which is composited. Three further traps, all hit
  for real: a whole-image aggregate cancels any per-pebble effect, since ten
  pebbles sit at ten independent flux phases; a fixed screen patch can't
  isolate one pebble, because the flux moves its silhouette by 30% of the
  radius; and picking "cores" by darkness can't measure lightness, since the
  selection is conditioned on it. A pebble's own shading already varies its
  alpha fourfold across its surface, which swallows most spread metrics -
  for anything subtle on the pebbles, the live site is the instrument.
- **Software WebGL is slow** (1-30 fps) and GSAP's lag smoothing stretches
  tweens: something sluggish in a headless run may just be slow rendering.
  Log the state rather than trusting timing. For frame-exact checks use
  Playwright's fake clock and grab the canvas inside a
  `requestAnimationFrame` wrapper via `toDataURL` (it leaves out the HTML
  overlays) - slow, so only when it matters.
- **One headless browser at a time**: two in parallel slowed software
  WebGL enough to look like a failed click. Wait on state (e.g. `.fog`'s
  opacity above 0.9 once a project is open), not fixed timeouts.
- **Finding a pebble to click**: slot 0 sits around (310, 185) at
  1280x800 and (80, 139) at 390x844, slot 1 one step right - but random
  sizes and the bumps shift them every load. More reliable: wait for the
  spotlight tag to read the project's name, then click the knot the string
  is tied to (`.tag-string__knot`'s `cx`/`cy`) - the page then tells you
  where the pebble actually is. The knot sits at 0.9 of the radius, which
  the flux can pull the surface inside, so walk up the screen from it a few
  times (0, 14, 28... px) until the click lands.
- **Useful selectors**, all driven by React state so they say what the app
  thinks: `.bar.is-open`, `.bar__title`, `.bar__status` (empty once the
  model has loaded), `.drawer.is-available` / `.is-open`,
  `body.drawer-open`, `.drawer__image`, `.cube-tag--spotlight`,
  `.cube-tag--empty`, `.fog` opacity, `.tap-hint.is-showing`.
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
