Flux and Flow — a catalog of projects, explored in three dimensions.

Live at https://atireg.github.io/FluxAndFlow/ (deployed from `main` by
.github/workflows/deploy.yml on every push).

Adding a project: edit the `projects` array near the top of src/script.js
(the fields are listed in CLAUDE.md). Each entry declares the slot it sits
in and its own models; any text field left empty is skipped rather than
rendered blank. An optional `view` sets the camera angle the project opens
on (and, with `sway`, a slow nod of the camera); `gather: true` makes its
points gather out of a scattered cloud each time it opens; `images` fills
the drawer's picture frames. Slots with no project show the rock thumbnail
and answer a click with "Still empty...". See DECISIONS.md for why things
are built the way they are, and CHANGELOG.md for what changed when.

Add `?cloudtest` to the address to fill every slot with a copy of the
first project - a load test, see DECISIONS.md.

    npm install
    npm run dev      # dev server
    npm run build    # production build into dist/


TO DOs
======

Next up (waiting on content)
    [ ] Captions / photo credits for Rock Print's five pictures, if
        wanted (the `caption` fields are empty)
    [ ] A video in the drawer, if wanted. Agreed approach: a short clip
        (under ~1 min) compressed to a small MP4 in static/, playing as a
        silent loop with a poster frame; a longer film or one with sound
        embedded from Vimeo (or YouTube unlisted, no-cookie). Not played
        from Google Drive - Drive is only a way to hand the file over
    [ ] Write the real copy for Rock Print - year, role, context, body,
        credits. The fields hold unmistakable [PLACEHOLDER ...] text, put
        there to check the drawer works on the live site - it is live and
        needs replacing. State the role accurately
    [ ] Check the licensing/attribution for the Rock Print model now that the
        repository is public and the site serves the .glb
    [ ] Confirm Rock Print now opens on Safari (Mac and iPhone): tapping its
        cube did nothing there; selection no longer relies on Safari's
        `click` (see DECISIONS.md "Safari"). If it still fails, note the
        device and any message in the project bar
    [ ] More projects: each needs a slot, a thumbnail, a point-cloud .glb
        and (optionally) a `view` - see CLAUDE.md

Landing/welcome view
    [ ] Graphics (me as a figure?) + welcome text explaning the webside's concept
    [ ] How does that transform into the cubes/catalog view - maybe just a semi-transparent surface with the text and the figure on top of the moving cubes?

Navigation and general layout
    [ ] Logo
    [ ] Add buttons to switch between views
    [ ] Add footer (Copyrights, )
    [ ] Per-project URLs, so a single project can be linked to directly

Catalog view
    [ ] The element of surprise or discovery - when hovered on a cube add little 3D objects representing each project (e.g. a rock, an aggregate, a spider...)
        (every cube holds the rock for now, empty slots included)
    [ ] Add a "magic/mystery" appearance (e.g. fog shader or lights)
        (scene fog is off for a reason - see DECISIONS.md before re-adding)
    [ ] Change the shape of the cubes when hovering on them
    [ ] Make the content swing and make the colors go crazy

Details view (per project)
    [ ] The project view's own loading state is still a plain pulsing dot +
        "Loading model" in the project bar while the point cloud downloads -
        could borrow the start-up loader's flow field

Performance and tech
    [ ] Real thumbnails as binary .glb rather than .gltf with embedded
        base64 - about a quarter smaller each
    [ ] Destroy all objects after they move out of the screen
    [ ] Point-cloud colours from the scan: COLOR_0 is still in the .glb but
        unread - the points are drawn in three inks. Use it, or drop it
        (~315 KB less per cloud)
    [ ] Remove `?cloudtest` once there are real projects to fill the grid
    [ ] src/loader/ is dead code - nothing imports it (an old, unused
        preloader; the start-up loader lives inline in src/index.html)

Sound?


Done
====

Loader
    [x] Start-up loader inline in index.html: flowing particles around the
        wordmark, real progress, pouring into the centre on exit; "paper",
        chosen from six palettes compared live. Stays at least 5s, the bar
        filling steadily over them

Loading many projects (tested with ?cloudtest)
    [x] Point clouds load only when a project is opened (ten at start-up
        measured ~9.7 MB, ~9s on 4G); ten rock thumbnails ~2 MB, ~2s on 4G

Look
    [x] One palette everywhere (CSS custom properties in styles.css; scene
        colours in script.js kept in step by hand through screenColor())
    [x] The whole site is "paper": dark ink on a warm light ground; cubes
        are tinted glass with teal edges; orange marks the invitations
    [x] Fira Sans everywhere

Navigation and layout
    [x] Project bar with the title and a way back; title on one line at
        every width; moves into the drawer on a small phone
    [x] Text in a drawer pulled from the edge (superseded the split screen)
    [x] Handles resizing, including across the mobile/desktop breakpoint

Catalog view
    [x] Fixed number of slots (SLOT_COUNT = 10), reachable on every viewport
    [x] Cubes drift and rock independently; the pointer stirs them; no orbit;
        a hovered cube just tints teal, no pulse
    [x] One cube at a time (any cube) glows orange and jumps, continuously,
        easing out of and back into its float
    [x] Every cube holds the little rock (one download, cloned)
    [x] An empty slot's click answers "Still empty..."
    [x] The orange cube shows a blinking "Project XX", gone once it settles;
        no other names on the grid (three labelling ideas tried and removed
        - see DECISIONS.md, "Tried and removed")
    [x] Clicking a project: instant boom, the others hang, then fall slowly;
        the camera moves in while they fall; they return on the way back

Details view
    [x] One-point perspective by default; transitions only tilt, never roll
    [x] Per-project camera angle (`view`, with `zoom` and `lift` per
        layout); Rock Print lands on a view fitted to a phone screenshot
    [x] Slow ambient rotation of the model (the model, not the camera)
    [x] The camera slowly nods up and down over Rock Print (`view.sway`)
    [x] Rock Print's points gather out of a scattered cloud on open
    [x] Points: three inks (dark red, orange, grey), three sizes,
        semi-transparent
    [x] A grey fog rolls in behind the project, and clears on the way back
    [x] Opening the About drawer: on a wide screen the model moves left and
        stays whole (hint and zoom work there); on a phone, a close-up
    [x] Double-click / double-tap zooms towards that spot, and back
    [x] A white touch point with a black outline taps twice every 5s,
        hinting at the zoom - zoomed in too, where it hints at zooming back
        out
    [x] Pictures in the drawer: Rock Print has five (one full width, four
        two to a row), sized for the web in static/images/

Performance and tech
    [x] Deployed early (GitHub Pages)
    [x] Point cloud 2.2 MB -> 922 KB (quantized), no pointless Draco decoder
    [x] Point size consistent across pixel ratios and projections
