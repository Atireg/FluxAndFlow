Flux and Flow — a catalog of projects, explored in three dimensions.

Live at https://atireg.github.io/FluxAndFlow/ (deployed from `main` by
.github/workflows/deploy.yml on every push).

Adding a project: edit the `projects` array near the top of src/script.js
(the fields are listed in CLAUDE.md). Each entry declares the slot it sits
in and its own models - a point cloud, or a plain mesh sampled into points
as it loads - and any text field left empty is skipped rather than
rendered blank. An optional `view` sets the camera angle the project opens
on (and, with `sway`, a slow nod of the camera); `gather: true` makes its
points gather out of a scattered cloud each time it opens; `drop` drops
copies of a rod-built mesh onto a surface with physics; `images` fills the
drawer's picture frames. Slots with no project show the rock thumbnail and
answer a click with "Still empty...". See DECISIONS.md for why things are
built the way they are, and CHANGELOG.md for what changed when.

Add `?cloudtest` to the address to fill every slot with a copy of the
first project - a load test, see DECISIONS.md.

    npm install
    npm run dev      # dev server
    npm run build    # production build into dist/


TO DOs
======

Next up (waiting on content or a check from the user)
    [ ] The real copy for both projects - year, role, context, body,
        credits. Rock Print's and Emergent Space's fields hold unmistakable
        [PLACEHOLDER ...] text so their About drawers exist; it is live and
        needs replacing. State the role accurately
    [ ] Captions / photo credits for both projects' five pictures, if
        wanted (the `caption` fields are empty)
    [ ] A video in the drawer, if wanted. Agreed approach: a short clip
        (under ~1 min) compressed to a small MP4 in static/, playing as a
        silent loop with a poster frame; a longer film or one with sound
        embedded from Vimeo (or YouTube unlisted, no-cookie). Not played
        from Google Drive - Drive is only a way to hand the file over
    [ ] Check the licensing/attribution for the Rock Print and Emergent
        Space models now that the repository is public and the site serves
        them
    [ ] Confirm on Safari (Mac and iPhone), all fixed blind: tapping a
        pebble opens its project (it did nothing - selection no longer
        relies on Safari's `click`), and the names, their string and the
        zoom hint draw over the pebbles and the cloud, not behind (see
        DECISIONS.md, "Safari"). If anything fails, note the device and any
        message in the project bar
    [ ] More projects: each needs a slot, a .glb (point cloud or mesh) and
        a `view` - see CLAUDE.md
    [ ] Emergent Space's drop on a phone: confirm it runs smoothly on a real
        device (it was only checked with software rendering here)

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
        (each pebble shows its object all the time instead - Emergent
        Space's holds its aggregate (`thumbSize`), the rest the rock - and
        hover deliberately changes nothing; see DECISIONS.md)
    [ ] Add a "magic/mystery" appearance (e.g. fog shader or lights)
        (scene fog is off for a reason - see DECISIONS.md before re-adding)
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

Catalog
    [x] Ten fixed slots (SLOT_COUNT), reachable on every viewport, with
        room between them
    [x] Glass pebbles (cubes before), each its own shape and slowly
        changing it, each a random size (up to 1.8x); touching, they
        push each other apart,
        each holding the little rock or the project's own model; they
        float and rock, the pointer stirs them, no orbit
    [x] One pebble at a time glows orange and jumps; its name (a project's
        title, "Project XX" for an empty slot) hangs below it on a soft,
        thin string tied on with a dot, swinging in gusts. Names scale with
        the pebbles on screen and draw over them. Hover changes nothing
    [x] Clicking a project: an instant boom, the others fall slowly, the
        clicked pebble dissolves into a cloud of points that hands over to
        the project's own as they appear; opened projects' pebbles stay
        darker (remembered)
    [x] An empty slot's click answers "Still empty..."
    [x] The grid arrives a pebble at a time, surfacing out of the paper -
        after the loader and on the way back from a project

Project view
    [x] Rock Print lands on a view fitted to a phone screenshot; its points
        gather from a scattered cloud, in three inks and three sizes; it
        turns slowly (a turn every 80s) while the camera nods (`view.sway`)
    [x] Emergent Space (slot 1): the clicked pebble's points fall into a
        ground, and three solid aggregates drop onto it with live physics
        (cannon-es, loaded only for it), tumbling into an interlocked pile -
        a new drop every time - then turning. Each from a plain mesh sampled
        into 8,000 points as it loads; the mesh itself, in the rock's ink,
        in its pebble; opening the About drawer zooms in on the three
    [x] Points on the move (the gather, the dissolve, the fall into
        Emergent Space's ground) draw tapering tails, gone once they settle
    [x] A grey fog rolls in behind the project
    [x] The About drawer: model moves left and stays whole on a wide screen,
        a close-up on a phone (Emergent Space: in on the pile in both);
        five pictures in each, Emergent Space's diagrams full width
    [x] Double-click / double-tap zoom, hinted every 5s by a white touch
        point that scales with the screen
    [x] Camera moves only tilt, never roll

Site
    [x] "Paper" palette and Fira Sans everywhere
    [x] Start-up loader (inline, real progress, at least 5s); its flow
        field stays, drifting behind the pebbles and parting round them
    [x] Point clouds load only on click (ten at start-up measured ~9.7 MB)
    [x] Point cloud 2.2 MB -> 922 KB (quantized)
    [x] Project bar, drawer, resizing across the phone/desktop breakpoint
    [x] Live on GitHub Pages
