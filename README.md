Flux and Flow — a catalog of projects, explored in three dimensions.

Live at https://atireg.github.io/FluxAndFlow/ (deployed from `main` by
.github/workflows/deploy.yml on every push).

Adding a project: edit the `projects` array near the top of src/script.js.
Each entry declares the slot it sits in and its own models, and any text
field left empty is skipped rather than rendered blank. An optional `view`
sets the camera angle the project opens on; without it the project gets the
square-on default. See DECISIONS.md for why things are built the way they
are.

    npm install
    npm run dev      # dev server
    npm run build    # production build into dist/


TO DOs:

Landing/welcome view
    [ ] Graphics (me as a figure?) + welcome text explaning the webside's concept
    [ ] How does that transform into the cubes/catalog view - maybe just a semi-transparent surface with the text and the figure on top of the moving cubes?

Loader
    [ ] Develop something flow-related
        (there is a plain pulsing dot + "Loading model" in the project bar
        while the point cloud downloads - functional, not yet flow-related)

Navigation and general layout
    [ ] Logo
    [ ] Add buttons to switch between views
    [ ] Add footer (Copyrights, )
    [x] Project bar with the title and a way back to the catalog
    [x] The title stays on one line at every viewport width - it used to
        wrap onto two on phones and on wide desktops
    [x] On a small phone the bar + the open drawer left very little room for
        the model. Fixed by moving the title into the drawer's own header
        once the drawer is open on a narrow viewport, rather than shrinking
        the drawer itself - see DECISIONS.md

Color palette and typography
    [x] Select one color palette and stick to it in all views
        (CSS custom properties on :root in styles.css; the scene colours in
        script.js are kept in step with them by hand)
    [x] Select the fonts and stick to them in all views
        (Fira Sans - the old <link> pointed at a Google Fonts share page
        rather than a stylesheet, so it had never actually loaded)

Catalog view
    [ ] The element of surprise or discovery - when hovered on a cube add little 3D objects representing each project (e.g. a rock, an aggregate, a spider...)
    [ ] If a cube is empty - add a message saying (to be discovered later)
        (clicking an empty cube is currently a silent no-op)
    [ ] Add a "magic/mystery" appearance (e.g. fog shader or lights)
        (the old fog was configured near-beyond-far and is now off - see
        DECISIONS.md before re-adding it)
    [ ] Change the shape of the cubes when hovering on them
    [ ] Make the content swing and make the colors go crazy
    [x] Fixed number of slots (SLOT_COUNT = 10), stable per project, reachable
        at every viewport including portrait phones
    [x] Cubes drift slowly and independently instead of bouncing on a fixed
        beat. One cube at a time - any cube, empty slots included - jumps:
        a quick rock, a lift, a scale pulse on it and its thumbnail
        together, lit up light red inside and out. Settles after 5
        seconds, a beat later another one starts, continuously - never
        the cube under the cursor or while a project is open.
        See DECISIONS.md.
    [x] Clicking a project sets off a quick send-off (about a second) before
        the camera moves in: the other cubes shake harder and harder, then
        fall down the screen, tumbling off the bottom. The chosen one holds
        still. Going back brings them home as the grid fades in.
        See DECISIONS.md.

Details view (per project)
    [x] Integrate 2D content per project - text only so far
    [x] Slow ambient rotation of the model while a project is open - the
        model only, not the camera; see DECISIONS.md for why that
        distinction mattered here
    [x] Opening the About drawer pulls the camera into a close, elevated
        crop of the model rather than just reframing around it - see
        DECISIONS.md
    [x] Moving between all projects and a project (and in and out of the
        drawer's close-up) only tilts the camera - the grid no longer rolls
        90° on the way in or out. The detail camera has to keep looking
        along the catalog's screen-up for this to hold - see DECISIONS.md
    [x] Per-project camera angle (`view` in the projects array). Rock Print
        opens on an elevated three-quarter view fitted to a screenshot of
        the shot wanted - see DECISIONS.md
    [ ] Images and video in the drawer
    [x] Split the screen in two: half for 3D content/half for the 2D content
        (then superseded: the text now lives in a drawer pulled from the edge,
        so by default the model gets the whole canvas)
    [ ] Per-project URLs, so a single project can be linked to directly
    [ ] Write the real copy for Rock Print - year, role, context, body,
        credits. The fields currently hold unmistakable [PLACEHOLDER ...]
        text, put there deliberately to verify the About drawer renders and
        works on the live site - it is live now and needs replacing, not
        just filling in for the first time
    [ ] Check the licensing/attribution for the Rock Print model now that the
        repository is public and the site serves the .glb

[x] Handle resizing...
    (the catalog re-arranges without rebuilding; an open project re-frames and
    re-lenses, including across the mobile/desktop breakpoint)

Performance Check
    [ ] Destroy all objects after they move out of the screen
    [ ] Add shaders for the colors of the point clouds
        (COLOR_0 is deliberately kept in the .glb for this, although nothing
        reads it yet)
    [x] Deploy at least part of the project early on
    [x] Point cloud down from 2.2 MB to 922 KB, and the Draco decoder it used
        to pull for nothing is gone

Sound?

TECH STUFF

    [x] chek the pixel ratio setting for the size of the points
        (uPointScale now carries pixels-per-world-unit from the JS side, so a
        point keeps the same size across pixel ratios and under either
        projection)
    [ ] src/loader/ is dead code - nothing imports it
