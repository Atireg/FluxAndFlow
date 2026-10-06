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

## Session 2 — 2026-10-04 / 2026-10-06

`e0c070e`..`40a7edf` (branch `ccr-584d8563-rtv32f`, merged to `main` as it
went)

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
- **Catalog motion.** Replaced the fixed Y-bounce with a slow independent
  wander on all three axes, and added a spotlight cycle: one cube at a
  time rocks and blinks its edges, inviting a click - never while hovered,
  never while a project is open. Rebuilt the whole per-cube animation
  around one state function per frame to make the two coexist cleanly,
  which in the process fixed two pre-existing bugs in hover's old separate
  animation loop: edges that dimmed to grey permanently after the first
  hover instead of returning to cyan, and a thumbnail that jumped to ~5x
  size while hovered and settled smaller than its original size
  afterwards. See DECISIONS.md. Merged and deployed.
- **Spotlight, take two**, after seeing it live: faster and wider rotation,
  an actual jump (cube and thumbnail scale up together while the cube
  lifts, out of the same beat that already drove the glow), edges now
  blink to a dedicated light red rather than the drawer's dark warm
  accent, and the whole effect ramps in and back out over the dwell
  instead of popping and snapping. Opened eligibility to every cube, empty
  slots included, and made the cycle continuous - a flat 5s dwell, a brief
  gap, the next cube, never repeating the one that just finished. Fixed a
  gap the jump exposed: openProject reset the clicked cube's rotation but
  not its scale, so a residual jump-scale would have rendered the detail
  model larger or smaller than it actually is - caught and confirmed fixed
  by forcing a click mid-jump in a real browser. See DECISIONS.md.
- **Spotlight, take three**: the face now blinks to the same light red as
  the edges, not just the edges - lit up inside, not only outlined. Caught
  the matching gap this opened before it shipped: openProject reset edge
  colour on click but not face colour, and the face fades out over 0.8s
  rather than vanishing instantly, so a residual glow would have shown as
  a brief red tint during that fade. Reset both now, verified by forcing
  a click mid-glow and confirming no tint and a clean settle. See
  DECISIONS.md.
- **Fixed the opening transition's rotation glitch.** Clicking a project
  made the whole grid snap to a skewed diagonal angle for the first few
  frames before settling square. Root cause: the catalog camera sits
  exactly overhead, the one position where OrbitControls' spherical math
  can't tell which way is "around", and frameDetail's own geometry keeps
  that ambiguous axis pinned throughout the tween rather than only at the
  start - confirmed with frame-by-frame quaternion logging in a real
  browser showing the camera's roll snap to its final value in a single
  frame while its pitch was still easing in. Fixed by slerping the
  camera's quaternion directly between known start and end orientations
  instead of leaving OrbitControls to re-derive orientation from a
  position that passes through the degenerate point. Checked the reverse
  (closing a project) too and confirmed it was never broken - verified
  before and after across desktop and mobile layouts. See DECISIONS.md.
  *(Wrong about closing - see "Actually fixed the 90° roll" below.)*
- **The model turns slowly while a project is open** - a full rotation
  every 40s, ambient rather than something to watch. This is not the
  auto-rotation that was removed early in Session 1: that orbited the
  camera and turned the cube's edges off-square, which is why it was
  pulled; this turns the point cloud itself, parented inside the cube, so
  the camera and the cube's own edges never move. Checked that the fit
  computed once at open time still holds the model as it turns - sampled
  the actual asset across a full rotation in both layouts, including the
  narrowest profile at 90°, and it stays inside the frame throughout. See
  DECISIONS.md.
- **Fixed the closing transition popping the whole grid into view at full
  opacity, point-blank against the camera, for a few frames.** The earlier
  claim in this log that closing "was never broken" checked only the
  camera's own orientation - and was wrong even about that (see "Actually
  fixed the 90° roll" below) -
  this was a different bug, in the opacity/depthWrite reveal, not the
  camera. Root cause: flipping back to catalog mode immediately resumes
  the per-frame update that writes every cube's opacity outright each
  frame as a plain, unconditional value - not a diff - so it was
  overwriting the closing tween's eased value back to full on every frame
  before the tween could ever actually render partway through. The tween
  always looked instant because, in effect, it was: caught by logging the
  cube's own opacity frame by frame after closing, which read 1 within
  about one frame regardless of the tween's given duration. Fixed by not
  resuming that per-frame update until the reveal's own tweens finish, and
  by delaying and re-easing the reveal itself so it only starts once the
  camera has begun pulling back. Verified by repeating the open/close
  cycle several times and checking the first several frames each time, on
  both desktop and mobile. See DECISIONS.md.
- **Reported again as "the strange 90 degree rotation," this time closing
  a project while the About drawer was open.** Reproduced it and found a
  real, different bug: closing drops the `drawer-open` body class
  instantly, so the bar's title switches back to showing (a plain
  `display` toggle) while the drawer's own title is still visible,
  mid-way through its own slide-out - both rendered at once for a moment.
  Fixed with a proper crossfade instead of an instant swap. Went looking
  for a matching camera-orientation bug too, given the report, and could
  not find one after the title fix: 16 repeated open-drawer-close cycles
  on mobile, plus the same frame-by-frame quaternion logging used for the
  original rotation bug, came back clean and smooth every time. Logged
  what was checked and why in DECISIONS.md in case this surfaces again -
  if it does, it isn't this bug. *(Wrong - see the next-but-one entry.
  The logs did show the camera bug; it was misread.)*
- **The drawer now pulls the camera into a close, elevated crop of the
  model instead of just making room for it.** Reading the description
  isn't the moment to show the whole piece - a dedicated
  `frameDetailCloseup` frames from above at a fixed angle, tight enough
  that most of the model sits outside the frame on purpose. Deliberately
  not square-on and not full-fit, both for the first time in this view;
  see DECISIONS.md for why that one exception doesn't undermine the rule
  everywhere else. Checked this doesn't reopen the gimbal problem from
  earlier - it doesn't, since neither this shot nor the normal one sits
  anywhere near the pole. Verified on both layouts, including watching it
  keep turning (the slow rotation above) and transition back cleanly when
  the drawer closes.
- **Actually fixed the 90° roll on going back to all projects** (and the
  smaller one on opening). The two earlier "closing was never broken"
  claims in this log and in DECISIONS.md were wrong. The logs showed the
  camera arriving overhead rolled and then snapping upright in a single
  frame, and that was misread as a smooth ease. Root cause: the catalog
  has world +X to the right of the screen, but the detail view looked
  along +X and so had world +Z to its right. Every move between them had
  to roll 90°. The detail camera now looks along the catalog's own
  screen-up (-Z), so every transition is a pure tilt. The model is turned
  a quarter to compensate, so it shows exactly the same face as before.
  Every animated camera move now goes through one `moveCamera` helper,
  which states the end orientation instead of inferring it. It also
  cancels any move still in flight, which fixes the camera and lens
  getting dragged back towards the detail view on a quick open-then-back.
  Verified with a probe that fails on the live build (90.00° in one frame
  on every close, both layouts) and passes on the fix (0.0000 yaw/roll at
  every frame of every transition, both layouts). Also removed a debug
  hook that had shipped to the live site in the previous merge. See
  DECISIONS.md; README has a ticked item for it, and DECISIONS' slow-
  rotation entry now matches the model's new quarter-turn base. Merged
  and deployed.
- **Rock Print opens on its own camera angle**, an elevated three-quarter
  view, reproduced from a screenshot rather than eyeballed. Fitted a
  camera to the cube's corners in the screenshot to get the angle (49°
  elevation, 4° azimuth, under 2px error per corner, consistent only with
  the phone's real 30° lens). Then matched the model's starting turn
  (145°) by rendering it in steps against the shot. Projects now take an
  optional `view` in the projects array; without one they keep the
  square-on default. A custom view is framed on the cube rather than the
  model's scattered points, with its own margin. It sits centred on the
  screen when that already clears the title, and only drops as far as it
  has to otherwise. Measured against the screenshot at its own viewport,
  the cube's corners land 12px off on average. The drawer close-up keeps
  the project's heading at its usual 38°, since 49° left only fragments
  visible on a phone. Transitions checked again on both layouts: no
  snaps, and the only turn is the intentional 4°. CLAUDE.md's
  project-entry example now shows `view`. See DECISIONS.md.
- **Clicking a project blows the rest of the grid away first** *(since
  replaced by a faster drop - see below)*. Two seconds
  before the camera moves in: the other cubes shake harder and harder, then
  blow outward and towards the viewer, tumbling off the screen, while the
  chosen one holds still. Built as another per-frame mode (`'exploding'`)
  rather than tweens, plus a `'returning'` mode on the way back so the cubes
  are home before the grid fades in. Clicks and Escape during the explosion
  are ignored. Verified on both layouts: frame-by-frame screenshots of the
  sequence, clean camera transitions, and every cube back at rest after a
  round trip. See DECISIONS.md.
- **The project title stays on one line at every viewport width.** It
  wrapped onto two on phones (the bar was capped at 60% of the screen) and
  on desktops 1280px and wider (capped at 26rem while the font grew). Now
  `nowrap`, capped only at the screen's width, with an ellipsis as the
  fallback for a future title too long for a phone. Measured at eleven
  widths from 320px to 1920px: one line, nothing clipped. See DECISIONS.md.
- **The send-off now drops the cubes instead of exploding them, and in
  about half the time.** *(The shake and the fast fall have since been
  replaced by a flux and a slow fall - see below.)* After a shorter shake (0.55s), the other cubes
  fall down the screen under gravity, tumbling off the bottom edge with a
  slight stagger. The camera moves in at about 1.1s instead of 2s. It's
  the same per-frame mode with a new pose, renamed from `'exploding'` to
  `'dropping'`. Checked on both layouts: frame-by-frame screenshots,
  states in order, clicks and Escape mid-drop ignored, and every cube back
  home after a round trip. See DECISIONS.md.
- **An "Explore me..." tag on the pulsing red cube** *(orange since - see
  below)*, in the project title's
  font and weight, on the lower part of the cube's face and fading in and
  out with its glow. It's HTML over the canvas, placed by projecting the
  cube to the screen each frame, so it uses the real web font and doesn't
  block clicks. Hidden during the drop and in the project view. Checked on
  both layouts, including the Rock Print cube at the peak of its glow,
  where it sits clear of the rock thumbnail. See DECISIONS.md.
- **Docs brought up to date with the code.** README, DECISIONS and this
  file had drifted in places (the close-up heading, the rotation-start
  formula, the list of cube modes, a colour value, and pointers from
  superseded entries to their replacements). CLAUDE.md now gives the
  projects array's current line and notes that `DETAIL_MARGIN` only
  governs the square-on default, since a project with its own `view` is
  framed with `VIEW_FRAME_MARGIN`.
- **Clicking an empty cube says "Still empty...".** It used to do nothing.
  A tag like "Explore me..." appears on the clicked cube in the same spot,
  but in the cool palette rather than the red, stays for about a second
  and a half and fades. If the clicked cube was the one pulsing, it
  replaces "Explore me..." rather than stacking on top of it. Checked on
  both layouts, including a tap on the pulsing cube on a phone, and that
  clicking a project still opens it. See DECISIONS.md.
- **The send-off flows, then falls slowly.** *(The swirl and the wait
  before the zoom have since gone - see below.)* The hard shake is replaced by
  a wave of flux that ripples out from the clicked cube: the others swirl
  around their places and hop towards the viewer, the further ones a beat
  later. Then they fall down the screen over 1.2s instead of 0.45s. The
  whole send-off is about 2.5s, up from 1.1s. Checked frame by frame on
  both layouts; the project still opens after it, and every cube is back
  home after a round trip. See DECISIONS.md.
- **No more spin in the flux, and no pause before the zoom.** *(The flux
  itself has since been replaced by a single boom - see below.)* The cubes
  now ride the wave square: pushed out from the clicked cube and back, and
  tossed towards the viewer, without the swirl and rock. The camera starts
  moving in 0.3s into the fall instead of waiting for the screen to clear,
  and sets off at speed rather than easing in from a standstill. The
  falling cubes finish their fall under the fade. On a first visit, the
  model landing mid-zoom no longer restarts the move from rest. The
  project is fully framed about 2.2s after the click, down from about 4s.
  See DECISIONS.md.
- **The invitation is orange.** The pulsing cube, its "Explore me..." tag
  and the About handle (its pulse, border and hover) now share one orange,
  `#ff8c32`, in place of the reds. The CSS takes it from one custom
  property. Making the cube actually read orange took two fixes: the glow
  colour is given as raw values, because the renderer's linear output had
  been crushing it to brick red, and the face glows through its emissive
  colour, because the scene's cyan lights turned an orange base colour
  green. Checked on both layouts, catalog and project view, including the
  handle's hover. See DECISIONS.md.
- **The cubes fall straight down, without tumbling or drifting.** Asked
  as a test of the drop with no shake: the cubes now stay square from the
  wave all the way off the screen, then the sideways drift went too. They
  still let go at slightly different moments. Compared frame by frame
  against the tumbling version on both layouts. See DECISIONS.md.
- **An instant boom instead of the wave.** The second of flux still read
  as a lot of shaking. Now one shockwave from the clicked cube knocks the
  others outward and up towards the viewer in about a tenth of a second,
  with no bounce. They hang for a moment, then fall slowly and straight
  down. The camera starts moving in at about 0.95s, with cubes still on
  screen, and has settled by about 2s. Checked frame by frame on both
  layouts, and on a round trip including going back mid-fall. See
  DECISIONS.md.
- **A start-up loader, themed on flux and flow.** Particles stream along
  slowly braiding currents around the "Flux and Flow" wordmark, with a
  hairline progress bar and percentage. The flow strengthens as the
  catalog loads, and on the way out the streams pour into the centre as
  the grid fades in. It's inline in index.html so it shows before the main
  script has downloaded, tracks real asset progress, stays up at least
  1.6s, can't get stuck (failed loads count as done; 30s cap), and
  respects reduced motion. Checked on both layouts on a throttled network.
  See DECISIONS.md.
- **Load test: `?cloudtest` puts the point cloud in every cube.** *(Since
  changed to rocks in every cube - see below.)* Behind a
  query string, so the normal page is unchanged. Each cube downloads its
  own copy, as ten different projects would. Result: 9.7 MB instead of
  0.5 MB, and the grid appears after ~3s on Wi-Fi, ~9s on fast 4G and
  ~50s on slow 4G, against 1-2.5s now. Recommendation: small thumbnail
  clouds and/or letting clouds stream in after the loader. See
  DECISIONS.md.
- **Point clouds load only on click; `?cloudtest` now uses rocks.** The
  test fills every cube with a copy of Rock Print: its little rock loads
  with the page, its point cloud only when that cube is clicked, each
  downloaded separately. ~2 MB and ~2s to the grid on fast 4G, instead of
  9.7 MB and ~9s with clouds at start-up. See DECISIONS.md.
- **Rock Print's points gather out of a scattered cloud when it opens.**
  Each time the project opens, its points start as a loose, dim cloud
  around the model and spiral in to the pavilion over 3.6s, each at its
  own moment, strengthening as they arrive. Runs in the vertex shader (two
  extra attributes and one uniform), opt-in per project with
  `gather: true`. Checked frame by frame on desktop; the scatter was then
  made a little brighter and tighter. See DECISIONS.md.
- **The little rock in every cube.** Empty slots show it too (they still
  say "Still empty..." when clicked). It downloads once and is cloned into
  each cube. Fixed a start-up crash in the first version along the way.
  See DECISIONS.md.
- **Loader colours to explore.** *(Paper was chosen and the rest removed -
  see below.)* Six palettes: tide (default), ember,
  current, aurora, magma, paper. Streams are shaded between two colours by
  the direction they flow. `?loaderpreview` holds the loader on screen and
  cycles palettes with a tap; `?loader=<name>` picks one for a normal
  load. See DECISIONS.md.
- **The grid no longer orbits; the cubes float more and follow the
  pointer.** Dragging in the all-projects view doesn't turn the camera any
  more (orbiting still works inside a project). The idle drift is bigger,
  with a gentle rock, and moving the pointer through the grid carries the
  nearby cubes along like a hand through water: they lean with the push,
  overshoot a little and settle back. A still cursor doesn't move
  anything, so the cube under it stays put to be clicked. See
  DECISIONS.md.
- **The loader is "paper".** Dark ink streams with touches of orange on a
  light ground, chosen from the six palettes. The other palettes and the
  `?loaderpreview` mode are gone. See DECISIONS.md.
- **The paper loader hands over to the dark grid through spreading ink.**
  *(Disliked, and replaced by making the whole site paper - see below.)*
  The cut from light paper to the dark grid was too sudden. Now the
  streams pour into the centre, a pool of the site's dark spreads out from
  there with a soft, wavering edge until the paper is gone (~1s), and only
  then does the loader fade into the grid. Under reduced motion the paper
  dims to dark instead. Checked frame by frame on a phone viewport, both
  modes. See DECISIONS.md.
- **The whole site is paper.** Instead of bridging a light loader and a
  dark site, the site went light: dark ink on a warm light ground, teal
  accents, the orange invitation unchanged. The dark background turned out
  to be a three.js sky dome set to night, now removed so the page's own
  background shows. Cube faces and point clouds stopped using additive
  blending (invisible on a light ground): faces are tinted glass, points
  are dark ink (since three inks - see below). The loader's exit is a
  plain fade again. Checked on both
  layouts in every main state. See DECISIONS.md.
- **The point cloud is dark red, orange and grey.** Each point is given
  one of the three at random (a third each) when the cloud loads, so the
  speckle is fixed and turns with the model. See DECISIONS.md.
- **A grey fog rolls in as you zoom into a project.** A page layer behind
  the 3D canvas fades in over ~3s once the camera starts moving: grey at
  the edges, lighter around the model, with soft banks drifting across.
  It clears in ~1s when going back. Not three.js fog, which would grey
  the model itself. Checked on both layouts, drawer open and closed. See
  DECISIONS.md.
- **Double-click or double-tap to zoom in on the model.** In a project,
  it moves the camera in towards the tapped spot of the point cloud (to
  40% of the distance); again zooms back out. Phone double-taps are
  detected by hand, and the browser's own double-click is ignored for
  touch so the two can't cancel out. Checked on both layouts. See
  DECISIONS.md.
- **Frames for pictures in the About drawer.** Three empty, dashed frames
  under the text in Rock Print's drawer - one full width, two side by side
  - waiting for the images. Each is an entry in the project's `images`;
  setting its `src` fills it. The drawer's panel is now near-solid so the
  model doesn't ghost through the pictures. Checked on both layouts. See
  DECISIONS.md.
- **"Project 01"... labels near the pointer, instead of "Explore me...".**
  The tag is gone from the pulsing cube (which still glows). The cube under
  or nearest the pointer is labelled "Project 01" to "Project 10" by its
  grid slot, fading in as the pointer approaches and out as it leaves.
  "Still empty..." still answers a click on an empty slot. Checked on both
  layouts. See DECISIONS.md.
