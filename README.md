Flux and Flow — a catalog of projects, explored in three dimensions.

Live at https://atireg.github.io/FluxAndFlow/ (deployed from `main` by
.github/workflows/deploy.yml on every push).

The code: React renders the page (`src/app/`, `src/components/`), an
engine of focused modules runs the canvas (`src/engine/`), and each project
is its own module (`src/projects/`). CLAUDE.md maps the files; DECISIONS.md
says why the line between React and the engine is drawn where it is.

Adding a project is two steps: write `src/projects/<id>.js` exporting
`defineProject({ ... })`, then add it to the `catalog` array in
`src/projects/index.js`. Its settings say everything that's particular to
it - its slot and kind, its models, the camera angle and nod (`view`), the
gather, a physics drop, what a double-click does, timed zooms, and the
drawer's text, films (Vimeo) and pictures. CLAUDE.md lists them with an
example; `src/projects/schema.js` fills the defaults and rejects a
half-declared project. There is no per-project branch in the engine, so
nothing else needs touching. Each project has its own link, `#<id>` on the
site's address. See DECISIONS.md for why things are built the way they
are, and CHANGELOG.md for what changed when.


    npm install
    npm run dev      # dev server
    npm run build    # production build into dist/


TO DOs
======

Next up (waiting on content or a check from the user)
    [ ] Captions / photo credits for both projects' five pictures, if
        wanted (the `caption` fields are empty)
    [ ] Check the licensing/attribution for the Rock Print and Emergent
        Space models now that the repository is public and the site serves
        them
    [ ] Confirm on Safari (Mac and iPhone), all fixed blind: tapping a
        pebble opens its project, the names, strings and the hint draw over
        the pebbles and the cloud, and the playground shows every project
        (it showed Rock Print everywhere from a remembered `?cloudtest`
        address, now removed). See DECISIONS.md, "Safari"
    [ ] A short silent clip, if wanted: the agreed approach is a small MP4
        in static/ playing as a loop with a poster frame (longer films are
        Vimeo `videos`)
    [ ] More projects: each needs a slot, a .glb (point cloud or mesh) and
        a `view` - see CLAUDE.md
    [ ] kh-reuse (slot 3, the real world): its drawer text, pictures and
        films - it opens with none, so no drawer handle yet - and the recorded
        film to play on the laptop's screen, under its floating points
    [ ] Emergent Space's drop on a phone: confirm it runs smoothly on a real
        device (it was only checked with software rendering here)
    [ ] The catalog's streams on a phone: WebGL draws them one device pixel
        wide - darker (`STREAM_ALPHA` in src/engine/streams.js) if they're faint
    [ ] Rock Print's view from inside, on a phone: the lens widens to 90°
        there so it sees between the columns - check it reads as standing
        among them (`INSIDE_*` in src/engine/detail.js)

Landing/welcome view
    [ ] Graphics (me as a figure?) on the landing page
    [ ] A way back to the landing page from the catalog

Navigation and general layout
    [ ] Logo
    [ ] Add buttons to switch between views
    [ ] Add footer (Copyrights, )

Catalog view
    [ ] Real teaching and real-world projects: the empty slots stand in for
        them (`EMPTY_SLOT_CATEGORIES` in src/projects/schema.js) - drop a
        slot from that map once a project fills it
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
    [ ] The points' ink grain does nothing: the cloud's fragment shader
        reads a perlin texture at `uv`, but neither cloud has texture
        coordinates, so every point gets the same grain. Give each point its
        own (by index, say) - that would change the look - or drop it
    [ ] src/engine/smoke.js is parked, not in the scene - it is the
        candidate for the "fog shader" idea below. Use it or delete it
    [ ] The JS bundle is one 905 KB chunk (259 KB gzipped); Vite warns
        about it. cannon-es already splits out on demand - three.js could
        too

Sound?


Done
====

Content
    [x] The real copy for both projects - year, role, context, body and
        credits, drafted from the published descriptions (ETH, Gewerbemuseum
        Winterthur, ITECH Stuttgart) and approved by the user

Catalog
    [x] Ten fixed slots (SLOT_COUNT), reachable on every viewport, with
        room between them
    [x] Each pebble's warmth drifts with its own shape waves - graphite at
        a trough, a brown-grey at a crest - so no two are the same shade at
        once and none holds still. Chosen from five options; the other four
        are under "Tried and removed" in DECISIONS.md
    [x] Pebbles shaded in graphite (teal glass, pencil hatching and cubes
        before), each its own shape and slowly
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
    [x] An empty slot's click answers "under construction" or one of
        three others, at random (`src/app/words.js`)
    [x] Three kinds of project - research, teaching, the real world - each
        tagged in its bar; a filter in the catalog brings one kind forward
        and pushes the others back to half their size, fainter
    [x] The grid arrives slowly, a pebble at a time, surfacing out of the
        paper as the loader clears (and on the way back from a project),
        then what's inside them one by one

Project view
    [x] Rock Print lands on a view fitted to a phone screenshot; its points
        gather from a scattered cloud, in three inks and three sizes; it
        turns slowly (a turn every 80s) while the camera nods (`view.sway`,
        22s a nod)
    [x] Emergent Space (slot 1): the clicked pebble's points fall into a
        ground, and three solid aggregates drop onto it with live physics
        (cannon-es, loaded only for it), tumbling into an interlocked pile -
        a new drop every time - then turning. Each from a plain mesh sampled
        into 8,000 points as it loads; the mesh itself, in the rock's ink,
        in its pebble; opening the About drawer zooms in on the three
    [x] Emergent Space: the turn starts as soon as the pile looks still; a
        double-click drops it again (hinted "drop again"); an arrow and a
        live m/s reading show each aggregate's velocity as it falls
        (`drop.velocity`);
        pulsing blue dots mark where they interlock once fully at rest
        (`drop.contacts`); then the camera moves in on one interlock for
        5s, back out, the floor slows to a stop and 5s later it drops
        again, the fallen pile dissolving away first (`drop.closeUp`)
    [x] Points on the move (the gather, the dissolve, the fall into
        Emergent Space's ground) draw tapering tails, gone once they settle
    [x] A grey fog rolls in behind the project
    [x] The About drawer: model moves left and stays whole on a wide screen,
        a close-up on a phone (Emergent Space: in on the pile in both);
        five pictures in each, Emergent Space's diagrams full width
    [x] Double-click / double-tap, hinted every 8s by a white touch point
        that scales with the screen, "double-tap to" ("double-click to"
        with a mouse) over what it does hanging from it on a bouncing black
        string like the catalog's. Per project (`doubleClick`): zooms by
        default, holds Rock Print still until the next ("pause"), drops
        Emergent Space again ("drop again"); it pulses twice over (4.4s),
        then falls like a leaf off the screen; double-tapped, it dissolves
        into specks like the aggregates
    [x] Rock Print zooms in by itself every 10s and back out (`autoZoom`),
        in turn on a point of the pavilion (following it as it turns), from
        inside at eye height among the columns, looking between them, then
        from the same spot facing back (`eyeLevel`); its camera nods more
        slowly (22s). Its gather runs on its own clock and only every fifth
        point draws a tail, so it doesn't lag
    [x] Films in the drawer from Vimeo (`videos`, above the pictures):
        Emergent Space's one, Rock Print's two; full screen on a phone in
        its own player, "Watch on Vimeo" under each
    [x] On a phone, every drawer picture runs full width
    [x] A click on a drawer picture enlarges it over the page; a click or
        Escape puts it back
    [x] Camera moves only tilt, never roll

Site
    [x] A landing page: three short paragraphs (hidden currents, the
        background, the services) over the floating particles, and
        "Welcome to the F&F playground" on to the projects (the back link
        in a project reads "F&F playground")
    [x] A link to each project (`#rock-print`, `#emergent-space`): opens it
        straight through the loader; Back and Forward close and reopen it
    [x] Housekeeping: `?cloudtest` and `lil-gui` removed; repeated code
        pulled into shared helpers and components (twice)
    [x] React structure: the page in components (`src/app/`,
        `src/components/`), the canvas in an engine of focused modules
        (`src/engine/`), one module per project behind one schema
        (`src/projects/`) - `src/script.js` was 3,733 lines holding all of
        it. Look and feel unchanged
    [x] "Paper" palette and Fira Sans everywhere
    [x] The playground loads behind the landing page: its button is grey
        until it's ready, then orange, and leads straight in (no minimum
        time); the particles' streams
        carry on in the scene among the pebbles, parting round them and
        drifting towards the mouse or a finger
    [x] Point clouds load only on click (ten at start-up measured ~9.7 MB)
    [x] Point cloud 2.2 MB -> 922 KB (quantized)
    [x] Project bar, drawer, resizing across the phone/desktop breakpoint
    [x] Live on GitHub Pages
