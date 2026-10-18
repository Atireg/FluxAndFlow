# Flux and Flow

A portfolio: projects as graphite pebbles in a grid ("my playground");
clicking one knocks the others away, dissolves it into points and opens the
project's 3D model on the whole canvas, with its text, pictures and films
in a pull-out drawer.

- `README.md` - the project and its TODO list.
- `DECISIONS.md` - why things are built as they are. Read the relevant
  entry before touching the camera, the pebbles, the point clouds, the
  drawer or the loader. It opens with a contents list and ends with "Tried
  and removed": looks the user rejected - don't re-propose them unasked.
- `CHANGELOG.md` - one entry per session; its last "Open at end of
  session" list is where to pick up.

## Where things stand

- **Live**: everything built is on `main`; `git log origin/main..` shows
  anything not yet merged.
- **Landing page** (inline in `src/index.html`): three short paragraphs in
  the user's own words - change them only on request - fading in one
  by one over floating particles. The playground loads behind it: "Welcome to the F&F
  playground" is grey until it's ready, then orange, and leads straight in.
- **Playground**: ten pebbles, a random size each visit, slowly changing
  shape; one at a time glows orange with its name on a string. A filter
  (research / teaching / the real world) brings one kind forward. An empty
  pebble answers a click with a two-line phrase (`src/app/words.js`).
- **Rock Print Pavilion** (slot 0): a point cloud that gathers out of a
  scattered swirl, turns and nods; every 10s the camera moves in by itself,
  in turn on a point, from inside at eye height, and from there facing back.
  A double-click pauses it. Two Vimeo films in its drawer.
- **Emergent Space** (slot 1): three aggregates dropped with live physics;
  velocity arrows, interlock dots, a close-up, then a new drop. A
  double-click drops again. One Vimeo film in its drawer.
- **kh-reuse** (slot 3, the real world, `#kh-reuse`): a laptop
  (`static/models/laptop.glb`, made in code) drawn solid in light grey with
  rounded edges (`solid: { lit, shade }`), open, screen to the visitor, not
  turning (`still`). A third of the pebble's points settle onto its
  screen in the inks and float there with tails (`screen: 'Screen'`); a recorded film is to play
  there later. Its pebble holds a reuse sign (`reuse.glb`). No drawer text yet.
- **Links**: each project's own address is `#<id>` (`#rock-print`).
- **Drawer copy** is real for Rock Print and Emergent Space (approved by the user);
  change it only on request.
- **Waiting on the user**: picture captions/credits, model licensing,
  real-device and Safari checks.

## Working with the user

- **Publishing**: merge into `main` only when asked - usually "merge and
  build" - then confirm the deploy run. Otherwise commit, push the working
  branch and say it isn't live yet.
- **Keep turns short**: make the change, build, check for errors, push.
  Long headless runs have been too slow; when they say "don't render it",
  don't.
- **No screenshots in replies** - the user looks at the live site.
- **Requests come in quick succession**, often several at once or
  mid-turn, each a small look-and-feel step. Do them in order, as project
  settings where they're per project, and say in one line how an
  ambiguous one was read ("project view" has sometimes meant the playground).
- **Words**: when asked for wording, offer options and wait for "use it";
  never put unapproved text on the site.
- **Look and feel** went through many rounds: tune the existing constants
  before rebuilding anything.
- Placeholder project text stays obviously fake: the real copy and the
  role come from the user.

## Stack and layout

React (the page) + three.js (the canvas) + GSAP + Vite; cannon-es loads on
demand for Emergent Space's physics. No test suite.

    npm install
    npm run dev      # dev server
    npm run build    # production build into dist/

React owns the page, the engine owns the canvas - read that entry in
DECISIONS.md before moving anything across the line.

    src/index.html      the landing page and loader (inline, before the bundle), and #root
    src/app/            App.jsx (React state, refs, the `ui` bridge), words.js (the
                        page's small words), links.js (`#<id>`, Back and Forward)
    src/components/     the page's pieces: bar, drawer, DrawerFigure (+ ProjectImage,
                        ProjectVideo), ImageViewer (a picture enlarged), tags and
                        strings, tap hint, filter, fog
    src/projects/       the content: one module per project + schema.js
    src/engine/         the canvas - index.js assembles it and runs the render loop
    src/styles.css      all the CSS

Inside `src/engine/`: `state.js` (shared mutable state), `constants.js`
(the few shared numbers; its header maps the rest), `ease.js`, `colors.js`,
`catalog.js` (the grid), `detail.js` (opening and closing a project,
double-click, timed zooms, close-ups, the tap hint), `tags.js` (names,
strings, the hint's life, in screen pixels), `streams*.js`, `pile.js` (the
physics), and the folders `pebbles/`, `pointcloud/`, `camera/`, `shaders/`.
`smoke.js` is parked.

## Repository and deployment

- GitHub `Atireg/FluxAndFlow`, public. Work happens on the feature branch
  and is fast-forward merged into `main` to publish.
- `.github/workflows/deploy.yml` deploys `main` to GitHub Pages in about a
  minute: **https://atireg.github.io/FluxAndFlow/**. Confirm with the
  latest workflow run on `main` (the site itself isn't reachable from the
  container).
- Asset paths resolve through `assetUrl()` against Vite's `BASE_URL` - never
  hardcode a leading `/`.

## Adding or editing a project

1. write `src/projects/<id>.js`, exporting `defineProject({ ... })`
2. add it to the `catalog` array in `src/projects/index.js`

There is **no per-project branch in the engine**: a project behaves
differently only through its settings, read by one code path, and the
engine never imports `src/projects/` (it is handed `catalogSource`).
`defineProject` (`schema.js`) fills defaults and throws on anything
malformed. `rock-print.js` is the worked example.

```js
defineProject({
    id: 'rock-print',                     // also its link, #rock-print - renaming breaks shared links
    slot: 0,                              // grid position, 0..SLOT_COUNT-1
    title: 'Rock Print Pavilion',         // also the name on its pebble - keep it phone-short
    category: 'research',                 // 'research', 'teaching' or 'real-world' - required
    year: '', role: '', context: '',      // drawer rows, if non-empty - state the role accurately
    body: [], credits: '',                // drawer text; nothing at all = no drawer handle
    thumbModel: 'models/rock.gltf',       // in the pebble; thumbSize: 1.9 fits the project's own
    detailModel: 'models/RockPrintStructureReduced.glb',  // opened on click: a cloud, or a mesh sampled to points (`points`)
    view: { elevation: 58, azimuth: 4, turn: 94, zoom: { stacked: 1.75, side: 1.4 },
            lift: { stacked: 0.14, side: 0 }, sway: 13 },  // camera angle; give every new model one
    gather: true,                         // points gather from a scattered swirl on open
    // solid: true, still: true,          // a mesh drawn as itself, not points; no turn (kh-reuse);
    //                                       solid: { lit: [r,g,b], shade: [r,g,b] } for its own colour;
    //                                       screen: 'Screen' - the pebble's points float on that mesh
    doubleClick: 'hold',                  // 'zoom' (default), 'hold', 'drop' (with `drop`), 'none'
    autoZoom: 10,                         // camera moves in / out by itself every 10s (not with `drop`)
    eyeLevel: 0.4,                        // with autoZoom: two of every three moves in are from inside
    // drop: { count: 3, size: 3, ground: -1.2, solid: true, contacts: true,
    //         closeUp: { hold: 5, after: 5 }, velocity: true },  // physics drop (Emergent Space)
    videos: [{ vimeo: '294086902', title: '' }],  // Vimeo films above the pictures, by number
    images: [{ src: 'images/x.jpg', alt: '', caption: '', ratio: '3 / 2', wide: false }],
})
```

- **Slots**: always `SLOT_COUNT` (10) pebbles; raise it before an eleventh
  project. Empty slots stand in for the other kinds
  (`EMPTY_SLOT_CATEGORIES`) - take a slot out once a project fills it.
- **Pictures** go in `static/images/`: JPEG ~80, progressive, metadata
  stripped (no GPS on a public site); ~1500px across for a lead or wide
  one, 900px otherwise; `ratio` is the file's width / height. The first
  spans the drawer, the rest sit two to a row on a wide screen (one to a
  row on a phone) unless `wide`. No `src` = an empty dashed frame. A
  click enlarges one (`ImageViewer`).
- **Films** are Vimeo numbers (`vimeo.com/<number>`) - never paste a link's
  `?turnstile=` part, it's one visitor's session. `ratio` defaults to 16 / 9.
- **Models** are `.glb` in `static/models/`. Read "Quantized, not
  Draco-compressed" before compressing a cloud.
- **`drop`** only works with rod-built aggregates; read "Emergent Space:
  aggregates dropped with live physics" before retuning, and tune in Node.

## Things that will bite

- **Per-frame HTML never goes through React state.** Names, strings, the
  tap hint and "under construction" move every frame: React renders them,
  the engine writes their style through refs (`ui.overlays`). React state
  is only for what changes on a click.
- **A pebble's state is a pure function of mode + clock**, recomputed every
  frame: a GSAP tween on a property the frame also writes is silently
  overwritten. The arrival (`applyArrival`) and the filter's sink
  (`applyFocus`, `fadeFocus`) are laid over every mode afterwards; whatever
  a mode leaves unset must be reset first or it compounds. Exceptions with
  memory step in fixed increments (`FLOW_STEP`, `TAG_STEP`).
- **Pebbles are graphite, not glass**: tone is in the alpha, colour is a
  multiplier (`pebbles/gradient.js`), resting looks come from
  `restingFace*`/`restingRimColor`, glow from `paintGlow`. One orange means
  "click me"; don't add others. A pebble's random size is baked into its
  geometry, never `scale`. Cube-era names remain (`CUBE_SIZE`,
  `.cube-tag`, `userData.edges` = the rim).
- **Faces write depth only when visible** - an invisible face would punch
  holes in the streams.
- **The cloud loader re-skins every `Points`** in a model; anything else
  drawn as points there must set `userData.ownMaterial`.
- **Moving points have tails** that re-run the motion a moment earlier in
  the shader (`pointcloud/trails.js`); change the motion in `gather.glsl`
  or `DISSOLVE_GLSL` and the tails follow. A cloud's gather gives only
  every fifth point a tail (`GATHER_TRAIL_EVERY`) - more made it lag.
- **The gather runs on its own clock** (`gatherTime`, at most
  `GATHER_MAX_STEP` a frame) so a stalled frame holds it rather than
  jumping it; everything else uses `detailSince(pebble, t)`.
- **The tap hint** (`tags.js`, `HINT_*`) pulses, then falls like a leaf;
  double-tapped it dissolves through an SVG filter on the dot and words
  only - on the full-screen string SVG it froze the page. Change its CSS
  press timings and `HINT_PRESS`/`HINT_TAPS`/`HINT_CYCLES` together.
- **Camera moves go through `moveCamera`**; automatic ones aim where the
  point will be (`worldAhead`) then follow it (`follow`). The nod never
  tips the camera within `SWAY_POLE` of straight down - over the pole the
  controls flipped it and the screen shook.
- **Two lenses**: `CATALOG_FOV` 45, `DETAIL_FOV` 45 side / 30 stacked; the
  layout breakpoint is 860px. `DETAIL_MARGIN` differs with a phone's
  drawer parked or open - check both.
- **The background is the page's CSS**, the renderer transparent: no
  additive blending, colours through `screenColor()`. Scene fog is off;
  the grey fog is a CSS layer.
- **Safari** can't be tested here. Keep GLSL inside defined behaviour (no
  reversed `smoothstep`, no `pow(0, y)`), stack HTML by z-index (fog 0,
  canvas 1, overlays 2, drawer 3), and select on `pointerup`, never
  `click`. Never leave a test switch reachable from the public address:
  Safari auto-completed an old `?cloudtest` and showed it for days.
- **Nothing runs at module scope in `src/engine/`** - everything waits for
  `engine.start()`.

**Shared helpers - use them rather than spelling it out again**:
`engine/ease.js` for any 0..1 ramp; `rig.toScreen(vector)` for screen
pixels (it projects in place - never project first);
`rig.pointerToNdc` for a pointer; `halfHeightAt(fov, distance)`;
`pickInk(tone)` in a points shader with `pointInkUniforms()`;
`clickOnly(fn)` for a button over the canvas; `TagString`, `DrawerFigure`.

## After every fixed issue

Update whichever of these the fix made stale, in the same commit:
**README.md** (tick or add a TODO), **DECISIONS.md** (why, over what, what
would change it; rejected looks under "Tried and removed"; keep the
contents list in step with the headings), **CHANGELOG.md** (the current
session's entry), **CLAUDE.md** (state, gotchas, how the user works).

## Verifying a change

Build, serve `dist/` (gzipped, as Pages does) and drive it with Playwright
on the pre-installed headless Chromium (`--use-gl=angle
--use-angle=swiftshader`). Check the side (≥860px) and stacked layouts,
and a phone's drawer open and shut when touching layout. Keep it
proportionate. Run test scripts from the scratchpad, so screenshots never
land in the repository.

- **Click `#loader-enter` once it's enabled** (Playwright waits for that),
  then wait for `#loader` to be removed - its 2.6s exit. Or open
  `#rock-print` / `#emergent-space` to go straight to a project.
- **Software WebGL runs at 1-30 fps** (a frame or two a second on Rock
  Print): log state rather than trust timing, and don't judge smoothness
  here.
- **Measure colour on the page** (`page.screenshot()`, composited), not by
  reading the canvas - and for anything subtle on the pebbles, the live
  site is the instrument.
- **One headless browser at a time**; wait on state, not fixed timeouts.
- **To click a pebble**, choose its kind in the filter, wait for the
  spotlight tag to read its name, and click the string's knot
  (`.tag-string__knot` `cx`/`cy`), walking up a few pixels until it lands.
- **Useful selectors**: `.bar.is-open`, `.bar__title`, `.bar__status`
  (empty once loaded), `.drawer.is-available`/`.is-open`,
  `.cube-tag--spotlight`, `.cube-tag--empty`, `.tap-hint.is-showing`.
- Visited pebbles persist in `localStorage` within a context; the pile's
  physics is tuned in Node; views are fitted by mask overlap in a
  throwaway build (see DECISIONS.md).
- **No debug hooks or `console.log`s** in a merge.
