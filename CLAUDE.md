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
  the user's own words - change them only on request - fading in one by
  one over floating particles, then "Welcome to the F&F playground" last.
  The playground loads behind it: the welcome line is grey until it's
  ready, then orange. Followed, the currents run on darker and faster for
  1.6s while the playground compiles its shaders, then the pebbles surface
  and the scene's streams take the same particles over where they are; the
  filter fades in and the orange glow waits 3s for them.
- **Playground**: ten pebbles, a random size each visit, slowly changing
  shape; one at a time glows orange with its name on a string. A filter
  (research / teaching / the real world) brings one kind forward. An empty
  pebble holds nothing and answers a click with a two-line phrase
  (`src/app/words.js`).
- **The path** (the filter's last choice, `PATH_VIEW` in words.js): the
  employment history, like a CV - every pebble sinks and fades out
  completely, and under the name a
  washing line moving in the wind with ten of the tap hint's dots hanging
  from it, swinging (`src/components/PathView.jsx`). Each dot a milestone
  from the user's CV (`src/app/path.js`), labelled under it. On a phone the
  line runs down the left edge and the dots fly from it like flags, each
  labelled beside it. Hovered or tapped, a dot presses twice like the tap
  hint and a card drops from it on a string (details and a picture, both
  from the CV; `static/images/path-*.jpg`). The streams behind blow with
  the wind, left to right (`engine.setWind`). Put there "for now"; the
  user may reword them.
- **Rock Print Pavilion** (slot 0; role "Project lead" alone): a point cloud that gathers out of a
  scattered swirl, turns and nods; every 10s the camera moves in by itself,
  in turn on a point, from inside at eye height, and from there facing back.
  A double-click pauses it. Two Vimeo films in its drawer.
- **Emergent Space** (slot 1): three aggregates dropped with live physics;
  velocity arrows, interlock dots, a close-up, then a new drop. A
  double-click drops again. One Vimeo film in its drawer.
- **The devices** - kh ReUse and Nap Nap Hooray share one behaviour
  (`src/projects/devices.js`): a device made in code, solid light grey,
  still, not orbitable, its screen white with rounded corners. A third of
  the pebble's points settle on the screen and circle there like a loading
  sign while the device turns and its film loads; loaded, it turns back to
  face the visitor, the points drift out and fade as the film fades in,
  and the camera moves in square-on to the screen (its edges kept, its top
  under the title). A double-click pauses the film. With the About drawer
  out, the whole device, still square-on. On a phone every frame is fitted
  between the title and the drawer's handle.
- **kh ReUse** (slot 3, the real world, `#kh-reuse`; write the name
  exactly so, and "knippershelbig" as one lowercase word): a laptop, or a
  phone under 860px, each with its own recording (2560 x 1440; 1170 x
  1992). A reuse sign in its pebble. Drawer: the user's text (shortened,
  approved) with two links and a short Tech overview list; five
  screenshots placed in the text (`after`; two desktop `wide`, three phone
  `pair`).
- **Nap Nap Hooray** (slot 4, the real world, `#nap-nap-hooray`): the
  user's baby-sleep website on the phone (`nap-nap-hooray.mp4`, 1170 x
  1992, three times the screen's 390 x 664). A crescent moon (`moon.glb`,
  `thumbSize` 1.3) in its pebble. Drawer: 2026, "Web developer using AI",
  "Sleepless nights and cranky days"; the user's text (shortened,
  approved), with two lists; six phone screenshots in the text (`after`;
  two to a row on a wide screen, the first of each group `half`).
- **Frameless Glass Structures** (slot 7, the real world,
  `#frameless-glass`; under its title, in orange, "This part of the website
  is still under construction." - `notice`): the user's Rhino model of a glass pavilion
  (`frameless-glass.glb`, seven parts named after its Rhino materials),
  each part in its own look (`parts`: light matt-grey steel, oak timber,
  clear glass, each sheet's upper ply outlined thin dark grey); the person beside it isn't drawn - the pebble's points fall and
  form them (`figure`), in three greys (`inks`). Stands still
  (`still`); a double-click zooms. Over a glass sheet, joint or support (named after
  the user's drawing, GS1-GS8) the part is picked out, the turn holds and a
  card beside the pointer says what it is (`info`; a tap on a phone).
  A slider at the foot ("section") cuts it across its length, the far
  part cut away, each part's cut faces filled orange and their edges
  traced in black (the joints read as in a drawing) and a faint outline of the plane, wider than the model,
  shown only while the visitor handles the model or the slider (`section`). It stands
  on a soft floor at the foot of its foundations, the person set down onto
  it, a faint shadow under them (`floor`). Its view, on both layouts, is
  steeply from above, its length up the screen (the user's screenshot).
  As it opens it plays a `tour`: one turn round it (9s) ending with the
  cut's side towards the camera, then at once the section slides (8s), the
  camera coming down onto it over the first 3s and following it to just
  before the middle - through the middle of the ridge joint's trapezoid connection
  plate nearest it (z 227-278 mm in the file: `cut` 0.472) - closing in on the ridge joint GS2_GS6 where it's cut, from 45
  degrees above and a little from the side, the ridge running up the screen (8s; the
  user's second screenshot), the slider following; the slider, a double-click, the drawer or orbiting by
  hand stops it where it is. With the drawer out, the part the section
  keeps, from where it's cut, almost square-on (`view.drawer: { side,
  above, zoom }` - the user's screenshot). Drawer: the user's ZIM research
  text, rephrased (four paragraphs - the intro, then Construction,
  Geometry, Thermal analysis - and the funding line as `credits`;
  approved), a YouTube film and five
  pictures (the pavilion at glasstec, the joints, the joint in section); no
  year, role or context rows or thumbnail yet (the default rock).
- **Links**: each project's own address is `#<id>` (`#rock-print`).
- **Drawer copy** is real for all five projects, approved by the user
  word for word; change it only on request.
- **Waiting on the user**: the path's milestones checked; Frameless Glass Structures' year, role,
  context and thumbnail; a seventh Nap Nap Hooray picture (Sleep per
  day / Number of naps - sent inline, not as a file), picture
  captions/credits, model licensing, real-device and Safari checks.

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
  role come from the user. Names are written exactly as the user writes
  them (casing, spacing).
- **Uploads** (films, pictures) arrive under `/root/.claude/uploads/...` or
  the scratchpad. Films: `ffmpeg -c copy -map_metadata -1 -movflags
  +faststart` into `static/videos/`; check the shape matches the screen it
  plays on. Pictures: as under "Adding or editing a project". Replacing a
  file keeps its name.

## Stack and layout

React (the page) + three.js (the canvas) + GSAP + Vite; cannon-es loads on
demand for Emergent Space's physics. No test suite.

    npm install
    npm run dev      # dev server
    npm run build    # production build into dist/
    npm run models   # rebuild static/models/{laptop,phone,reuse,moon}.glb

React owns the page, the engine owns the canvas - read that entry in
DECISIONS.md before moving anything across the line.

    src/index.html      the landing page and loader (inline, before the bundle), and #root
    src/app/            App.jsx (React state, refs, the `ui` bridge), words.js (the
                        page's small words), links.js (`#<id>`, Back and Forward)
    src/components/     the page's pieces: bar, drawer, DrawerFigure (+ ProjectImage,
                        ProjectVideo), ImageViewer (a picture enlarged), tags and
                        strings, tap hint, filter
    src/projects/       the content: one module per project + schema.js; devices.js
                        (`DEVICE`, the settings the laptop and phone projects share)
    src/engine/         the canvas - index.js assembles it and runs the render loop
    src/styles.css      all the CSS
    static/             models/, images/, videos/ - served as they are
    tools/models/       the models made in code (the laptop, the phone, the reuse
                        sign, the moon) and the glTF writer they share - `npm run models`;
                        obj-to-glb.mjs: a Rhino OBJ (+ .mtl) into a .glb, one part per material

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
    notice: '',                           // a small orange line under the title in the bar, if non-empty
    body: [], credits: '',                // drawer text: paragraphs, or string arrays for a list;
                                          // [words](https://...) a link; nothing = no handle
    thumbModel: 'models/rock.gltf',       // in the pebble; thumbSize: 1.9 fits the project's own
    detailModel: 'models/RockPrintStructureReduced.glb',  // opened on click: a cloud, or a mesh sampled to points (`points`)
    view: { elevation: 58, azimuth: 4, turn: 94, zoom: { stacked: 1.75, side: 1.4 },
            lift: { stacked: 0.14, side: 0 }, sway: 13 },  // camera angle; give every new model one -
                                          // elevation, turn, zoom, lift: a number, or { side, stacked }
    gather: true,                         // points gather from a scattered swirl on open
    doubleClick: 'hold',                  // 'zoom' (default), 'hold', 'drop' (with `drop`), 'none'
    autoZoom: 10,                         // camera moves in / out by itself every 10s (not with `drop`)
    eyeLevel: 0.4,                        // with autoZoom: two of every three moves in are from inside
    // drop: { count: 3, size: 3, ground: -1.2, solid: true, contacts: true,
    //         closeUp: { hold: 5, after: 5 }, velocity: true },  // physics drop (Emergent Space)
    videos: [{ vimeo: '294086902', title: '' }],  // films above the pictures: a Vimeo number, or { youtube: 'JnKaReHR4So' }
    images: [{ src: 'images/x.jpg', alt: '', caption: '', ratio: '3 / 2', wide: false }],
})
```

A solid model with a film on its screen - `kh-reuse.js` is the example;
`...DEVICE` (`devices.js`) gives the first four lines, and
`view: { ...DEVICE_VIEW, zoom, lift }` the view's shared part:

```js
    solid: { lit: [222, 222, 220], shade: [160, 160, 162] },  // the mesh itself, not points (or `true`: the inks)
    still: true, orbit: false,            // no turn; no orbiting or wheel-zoom by hand
    screen: 'Screen',                     // the model's screen mesh (X across, Y up, Z out): white, rounded; the points circle there
    screenVideo: 'videos/x.mp4',          // a muted, looping film on it; the device turns and the points circle till it loads
    phone: { detailModel, screenVideo },  // shown instead under 860px
    view: { elevation: 15, turn: -90,     // square-on from a little above
            fillScreen: 1.05,             // whole device first, then in on the screen as the film starts, its top under the title
            drawer: 'whole' },            // with the drawer out, the whole device square-on, not a close-up
    images: [{ ..., pair: true }],        // two to a row on a phone too (tall screenshots)
                                          // `half`: the first picture two to a row as well, not across
                                          // `after: n`: in the text, after body[n], not below it
```

A model in parts (`frameless-glass.js`): `solid` gives the default look,

```js
    parts: { Metal: { lit, shade }, Glass: { lit, shade, opacity: 0.14 } },  // by material name; opacity < 1 see-through
    figure: 'People_ZIM',                 // a part not drawn: the pebble's points form it
    inks: [[176, 174, 170], [128, 126, 123], [80, 79, 78]],  // the pebble's points' three inks, not the clouds'
    info: { GS1: { title, lines: [] } },  // by part name: a card over it, the turn held
    section: true,                        // a slider cuts the model across its length (z in its own space)
    floor: true,                          // soft ground at the model's foot, the figure set down on it, its shadow
    tour: { orbit: 9, cut: 0.472, focus: 'GS2_GS6', reach: 0.17, over: 8, side: 20, above: 45 },  // played as it opens - see schema.js
```

- **Models from Rhino** come as OBJ + .mtl (Rhino 7 has no glTF export):
  `node tools/models/obj-to-glb.mjs model.obj name.glb` merges each
  material's pieces into one part named after it. Ask for named materials.
  To name parts of their own (for `info`), a script per model passes
  `labelOf` (`tools/models/frameless-glass.mjs`); the name travels in the
  node's glTF extras (`userData.part`), as three.js renames repeated nodes.
  `{ name, edges: true }` marks a part the site outlines in thin dark grey
  (`makeEdgeMaterial`, cut by the section like the parts).
- **Slots**: always `SLOT_COUNT` (10) pebbles; raise it before an eleventh
  project. Empty slots stand in for the other kinds
  (`EMPTY_SLOT_CATEGORIES`) - take a slot out once a project fills it.
- **Pictures** go in `static/images/`: JPEG ~80, progressive, metadata
  stripped (no GPS on a public site); ~1500px across for a lead or wide
  one, 900px otherwise; `ratio` is the file's width / height. The first
  spans the drawer, the rest sit two to a row on a wide screen (one to a
  row on a phone, unless `pair` - tall phone screenshots) unless `wide`. No `src` = an empty dashed frame. A
  click enlarges one (`ImageViewer`).
- **A film on a model's screen** (`screenVideo`) is an .mp4 in
  `static/videos/`, H.264, no sound needed (it plays muted). Headless
  Chromium can't play H.264 - test with a WebM copy in `dist/`.
- **Films** are Vimeo numbers (`vimeo.com/<number>`) - never paste a link's
  `?turnstile=` part, it's one visitor's session - or YouTube ids
  (`watch?v=<id>`), played from youtube-nocookie.com. `ratio` defaults to 16 / 9.
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
- **Pebbles are graphite, not glass** - an unlit material with its own
  shade (`addGraphite`); tone is in the alpha, colour is a
  multiplier (`pebbles/gradient.js`), resting looks come from
  `restingFace*`/`restingRimColor`, glow from `paintGlow`. One orange means
  "click me"; don't add others. A pebble's random size is baked into its
  geometry, never `scale`. Cube-era names remain (`CUBE_SIZE`,
  `.cube-tag`, `userData.edges` = the rim). The face is a
  MeshBasicMaterial, yet three.js still fills an `emissive` uniform for it
  (`paintGlow` sets `material.emissive`): the shader declares one, or the
  frame throws on `.value`.
- **Faces write depth only when visible** - an invisible face would punch
  holes in the streams.
- **The cloud loader re-skins every `Points`** in a model; anything else
  drawn as points there must set `userData.ownMaterial`.
- **Moving points have tails** that re-run the motion a moment earlier in
  the shader (`pointcloud/trails.js`); change the motion in `gather.glsl`
  or `DISSOLVE_GLSL` and the tails follow. A cloud's gather gives only
  every fifth point a tail (`GATHER_TRAIL_EVERY`) - more made it lag.
- **The gather and the pebbles' arrival run on their own clocks**
  (`gatherTime`, at most `GATHER_MAX_STEP` a frame; `state.arrivalTime`,
  `ARRIVAL_MAX_STEP`) so a stalled frame holds them rather than jumping
  them; everything else uses `detailSince(pebble, t)`.
- **The tap hint** (`tags.js`, `HINT_*`) pulses, then falls like a leaf;
  double-tapped it dissolves through an SVG filter on the dot and words
  only - on the full-screen string SVG it froze the page. Change its CSS
  press timings and `HINT_PRESS`/`HINT_TAPS`/`HINT_CYCLES` together.
- **Camera moves go through `moveCamera`**; automatic ones aim where the
  point will be (`worldAhead`) then follow it (`follow`). The nod never
  tips the camera within `SWAY_POLE` of straight down - over the pole the
  controls flipped it and the screen shook.
- **The near plane follows the camera** in a project (`keepNear`,
  detail.js): a twentieth of the way to its target, 1 at most - a fixed 1
  sliced a model open when zoomed right in. Standing inside a cloud sets
  its own (`INSIDE_NEAR`).
- **Two lenses**: `CATALOG_FOV` 45, `DETAIL_FOV` 45 side / 30 stacked; the
  layout breakpoint is 860px. `DETAIL_MARGIN` differs with a phone's
  drawer parked or open - check both.
- **The background is the page's CSS**, the renderer transparent: no
  additive blending, colours through `screenColor()`. No fog, in
  the scene or on the page.
- **Safari** can't be tested here. Keep GLSL inside defined behaviour (no
  reversed `smoothstep`, no `pow(0, y)`, no `normalize()` of what can be
  zero - and choose, don't `mix(x, maybeNaN, 0.0)`: NaN times 0 is NaN;
  it hid Emergent Space's ground for a day), stack HTML by z-index (canvas
  1, overlays 2, drawer 3), and select on `pointerup`, never `click`. Never leave a test switch reachable from the public address:
  Safari auto-completed an old `?cloudtest` and showed it for days.
- **Nothing runs at module scope in `src/engine/`** - everything waits for
  `engine.start()`.
- **A `tour` turns the model, not the camera** (`tourSpin`, detail.js),
  which reads the same - the inks are lit from the view - by about once
  round, ending with the cut's side to the camera (`tourTurn`), then follows
  the cut at `side`/`above` (`framing.frameSection` gives the pose) -
  placed every frame on the tour's own clock (`rig.placeCamera`), blended
  from where the camera was over the first `TOUR_APPROACH` seconds: a tween
  for the move down, cut short where the following took over, made it jump; the visitor's slider, double-click, drawer
  or orbiting stops it (`stopTour`).
- **A section's orange fill is its cut outlines, triangulated**
  (`cutFaces`, `joinLoops`, load.js), rebuilt with the black cut lines on
  each step. Not the stencil: the model's parts aren't all closed, and
  stencil capping filled a whole glass panel through a gap. An outline
  that doesn't close is left unfilled.
- **A model's turn holds for reasons** (`setHold`, framing.js): 'click'
  (`doubleClick: 'hold'`) and 'hover' (a part with `info`); it turns
  again once neither holds it.
- **A project can have two models** (`phone`): `pebble.userData.details`
  keeps each once loaded, `pebble.userData.detail` is the one shown -
  chosen as the project opens, so read `detail`, never assume one model.
- **A screen's film decides the screen's shape**: the models in
  `tools/models/` size each screen to its recording (16:9, 390 x 664). A
  new recording of another shape means changing the screen there, then
  `npm run models` - otherwise it's cropped to fill.

**Shared helpers - use them rather than spelling it out again**:
`engine/ease.js` for any 0..1 ramp; `rig.toScreen(vector)` for screen
pixels (it projects in place - never project first);
`rig.pointerToNdc` for a pointer; `halfHeightAt(fov, distance)`;
`pixelRatio()` (camera/rig.js) for device pixels; `boxCorners(box)` and
`frameDevice` (camera/framing.js) for anything framed by its outline;
`layOver` (engine/index.js) for what's laid over a pebble's mode;
`pickInk(tone)` in a points shader with `pointInkUniforms()`;
`clickOnly(fn)` for a button over the canvas; `TagString`, `DrawerFigure`;
`sectionAt(section, share)` (pointcloud/load.js) for where a section cuts,
`setSection` to cut there; `INK_GRAIN_GLSL` (pointcloud/mesh.js) in a
solid model's shaders.

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
  `#rock-print` / `#emergent-space` / `#kh-reuse` to go straight to a
  project.
- **kh ReUse's films**: this Chromium can't play H.264, so after building
  overwrite `dist/videos/*.mp4` with WebM copies (`ffmpeg -c:v libvpx-vp9`)
  served as `video/webm`; rebuild before a merge. It plays them slowly -
  log `currentTime` rather than trust the frame on screen.
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
  `.cube-tag--spotlight`, `.cube-tag--empty`, `.tap-hint.is-showing`,
  `.drawer__handle` (opens the drawer), `.drawer__image`.
- **Films and screens**: the `<video>` elements aren't in the DOM - wrap
  `document.createElement` in `addInitScript` to keep them and read
  `paused`/`currentTime`. To see only the canvas (where a device sits, the
  title and drawer drawn as lines over it), hide everything but the canvas
  with an injected style and `screenshot({ omitBackground: true })`.
- **When something used to work**, bisect: `git worktree add` an older
  commit in the scratchpad, symlink `node_modules`, `npx vite build`, run
  the same script against its `dist/`, count pixels; remove the worktrees.
- **A user's screen recording** (a jump, a stall): `ffmpeg` the frames to
  grey raw video and diff consecutive frames - a spike is the jump, a run
  of frames with the canvas unchanged before it is a stall.
- Visited pebbles persist in `localStorage` within a context; the pile's
  physics is tuned in Node; views are fitted by mask overlap in a
  throwaway build (see DECISIONS.md).
- **No debug hooks or `console.log`s** in a merge.
