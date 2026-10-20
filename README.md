# Rubik's Cube Three.js Simulation

A 3D Rubik's Cube that runs entirely in the browser, built with Three.js and Vite. Turn faces with the keyboard and orbit around the cube with the mouse.

[Open the live demo](https://michaeldjabauri.github.io/Rubik-s-Cube-Three.js-Simulation/)

## Run locally

Requirements: Node.js 20.19 or newer, and npm.

```bash
git clone https://github.com/MichaelDjabauri/Rubik-s-Cube-Three.js-Simulation.git
cd Rubik-s-Cube-Three.js-Simulation
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173/Rubik-s-Cube-Three.js-Simulation/`).

| Command | What it does |
|---|---|
| `npm run dev` | Development server with live reload |
| `npm run dev:phone` | Same, but also reachable from a phone on the same Wi-Fi: open the Network address it prints |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally, exactly as it will be published |
| `npm test` | Run the tests once |
| `npm run test:watch` | Rerun the tests every time a file changes |
| `npm run test:coverage` | Run the tests and show which lines of the app they cover |
| `npm run deploy` | Build and publish to GitHub Pages |

## Tests

The tests use [Vitest](https://vitest.dev) and live in `tests/`, which mirrors the folder structure of `src/`. For example, `src/cube/RubiksCube.js` is tested by `tests/cube/RubiksCube.test.js`. They run in Node without a browser. The cube logic doesn't depend on the page at all, and the few tests that need page elements, like the cube editor's, use [happy-dom](https://github.com/capricorn86/happy-dom), a simulated page. They cover reading and writing notation, the logical cube state (including known facts such as `R U` taking exactly 105 repeats to return to solved), building the 3D cube, animating turns, a check that the 3D model and the logical state always end up showing the same stickers, the solvability check (every scrambled cube passes, and each kind of impossible cube is caught), the cube editor, the buttons, and a smoke test that starts the whole app in a simulated page and uses it like a person would. Together they run every line of the app code (`npm run test:coverage`).

## Controls

The keyboard uses standard Rubik's Cube notation, where faces are named by their position rather than their color.

| Key | Face | Color |
|---|---|---|
| `U` | Up | red |
| `D` | Down | orange |
| `F` | Front | white |
| `B` | Back | yellow |
| `R` | Right | green |
| `L` | Left | blue |

- Grab a sticker with the mouse and drag it to turn its layer that way. Dragging the background orbits the camera, and scrolling zooms. Middle layers can't be turned yet.
- Or click the buttons on the right: each row turns one face, clockwise or counterclockwise, and the face lights up while you hover its buttons.
- Or press a face's key to turn it clockwise, as seen looking straight at that face.
- Hold `Shift` while pressing the key to turn it counterclockwise.
- Press `Ctrl+Z` to undo the last move and `Ctrl+Shift+Z` to redo it. On a Mac, `Cmd` works too. Hold the keys to keep going.
- On a phone or tablet: drag a sticker with one finger to turn its layer, drag the background to orbit, and pinch with two fingers to zoom. The face buttons sit under the cube when the phone is upright.
- Use the buttons at the bottom to scramble, undo, redo, or reset. Scramble plays 25 random moves and shows them at the top of the screen. Reset rewinds every move quickly back to the start: the solved cube, or the cube you copied in.
- Use **Copy my cube** to paint your own real cube into the app (see below).
- Press the **?** button (or the `?` key) for a list of every control. First-time visitors also get a short hint.
- The app remembers your cube, its moves and the cube you're painting in the editor, so a reload or a closed tab never loses a solve in progress.
- The share button next to **?** makes a link to your cube: its scramble, the moves you made, or a cube you copied in. Whoever opens the link gets exactly the same cube. On a phone it opens the share menu; on a computer it copies the link. If you're in the middle of a cube when you open a link, the app asks before replacing it.
- The sun or moon button in the top-left corner switches between the dark and light theme. The app starts in your system's theme and remembers your pick.
- Double-click or double-tap to swing the camera back to its starting view. Leave the cube alone for a while and the camera slowly circles it, until you touch anything.
- Solve a scrambled or copied cube with your own moves and the cube celebrates: it hops and spins, confetti flies, and a message tells you how many moves you took. If your system is set to reduce motion, you only get the message.

In written notation, a letter alone is a clockwise quarter turn, `'` (prime) makes it counterclockwise, and `2` makes it a half turn. For example, `R U R' U2` means: right clockwise, up clockwise, right counterclockwise, up half turn.

## Copy your cube

**Copy my cube** opens an editor for copying a real, scrambled cube into the app, so you can play with it here (and, later, solve it).

1. Hold your cube with the **red center on top** and the **white center facing you**. The centers never move, so they tell the app which face is which.
2. The editor shows one face at a time and turns the 3D cube to match. Its instruction line says how to hold your cube for each face.
3. Pick a color from the palette and tap or drag across stickers to paint them. Tapping a sticker that already has the selected color clears it. The counts under the colors show how many of each you've painted out of 9.
4. Use the face tabs to move between faces. A green bar under a tab shows that face is done.
5. Once every sticker is painted, the app checks whether your cube could be real, and **Done** loads it.

**Close** leaves the editor without changing the app's cube, and so does `Escape`. Your painting is kept, so you can come back to it. After **Done**, reopening the editor shows the cube you loaded, ready for corrections. **Clear** starts over, after asking.

While your copied cube is loaded, the line at the top says so, **Reset** rewinds your moves back to the copy, and **Solved cube** takes the place of Scramble: it leaves the copy and starts again from a solved cube. The copy stays in the editor, so Done brings it back.

The check catches mistakes like a wrong number of stickers of a color, a corner or edge with colors that don't belong together (for example two opposite colors, or a corner whose colors run the wrong way round), a piece that appears twice, a twisted corner, a flipped edge, and two swapped pieces. It explains each one, and the stickers involved glow red where it can point at them. The check assumes the standard color scheme: white opposite yellow, red opposite orange, green opposite blue.

## Planned features

Everything, including the solvers, will run in the browser.

- Solve the cube with several algorithms, from a beginner layer-by-layer method to Kociemba's two-phase algorithm.
- Step through solutions with animated forward and backward controls.

## Architecture

```text
index.html               # Canvas and application entry point
vite.config.js           # GitHub Pages base path
src/
├── main.js              # Wires everything together: scene, input, toolbar, render loop
├── cube/
│   ├── Cube.js          # The cube the app talks to: logical state plus 3D model
│   ├── CubeState.js     # Logical state: the 54 stickers, and how each move changes them
│   ├── notation.js      # Reads and writes move notation like "R U R' U2"
│   ├── scramble.js      # Random scrambles that follow competition rules
│   ├── faces.js         # Each face's notation letter, color and direction
│   ├── pieces.js        # Which stickers belong to each corner and edge (Kociemba's tables)
│   ├── cubeCode.js      # Writes a whole cube down as text, for saving and for shared links
│   ├── validate.js      # Checks whether a painted cube could be real, and explains why not
│   ├── CubeDraft.js     # A cube being painted in the editor
│   ├── RubiksCube.js    # 3D model: the 26 colored cubelets as a THREE.Group
│   └── TurnAnimator.js  # Queues and animates face turns on the 3D model
├── input/
│   ├── commands.js      # Runs commands like a move or undo on the cube
│   ├── keyboard.js      # Turns key presses into commands
│   ├── doubleTap.js     # Spots a double-click or double-tap, for recentering the view
│   ├── picking.js       # Finds the sticker under the pointer
│   ├── drag.js          # The math for turning a layer by dragging a sticker
│   └── mouse.js         # Grabbing and dragging stickers to turn layers
├── ui/
│   ├── toolbar.js       # The buttons at the bottom, and the scramble text
│   ├── moveButtons.js   # The face-turn buttons on the right
│   ├── editor.js        # The "Copy my cube" editor
│   ├── help.js          # The help overlay listing every control
│   ├── firstVisitHint.js # The one-time hint for new visitors
│   ├── theme.js         # The dark and light theme, and the button that switches them
│   ├── storage.js       # Settings remembered in the browser, e.g. the theme
│   ├── savedCube.js     # Remembers the cube and the editor's draft in the browser
│   ├── share.js         # The share button, and opening a cube from a link
│   ├── toast.js         # Short messages like "Link copied"
│   └── solvedMessage.js # The "Solved!" message
└── scene/
    ├── camera.js        # Perspective camera, and fitting the whole cube on any screen
    ├── cameraGuide.js   # Swings the camera to a face, for the editor
    ├── celebration.js   # The hop, spin and confetti when you solve the cube
    ├── idleShowcase.js  # Slowly circles the camera when nobody is touching anything
    ├── lights.js        # Studio lights, reflections, and the floor that catches the cube's shadow
    └── renderer.js      # WebGL renderer with shadows, drawn over the page's backdrop
tests/                   # Mirrors src/, one test file per source file
├── main.test.js         # Smoke test: starts the whole app and uses it
├── cube/
│   ├── Cube.test.js
│   ├── CubeDraft.test.js
│   ├── CubeState.test.js
│   ├── notation.test.js
│   ├── cubeCode.test.js
│   ├── pieces.test.js
│   ├── scramble.test.js
│   ├── RubiksCube.test.js
│   ├── TurnAnimator.test.js
│   └── validate.test.js
├── input/
│   ├── commands.test.js
│   ├── doubleTap.test.js
│   ├── drag.test.js
│   ├── keyboard.test.js
│   └── mouse.test.js
├── scene/
│   ├── camera.test.js
│   ├── cameraGuide.test.js
│   ├── celebration.test.js
│   ├── createCamera.test.js
│   ├── idleShowcase.test.js
│   └── lights.test.js
├── ui/
│   ├── editor.test.js
│   ├── firstVisitHint.test.js
│   ├── help.test.js
│   ├── moveButtons.test.js
│   ├── savedCube.test.js
│   ├── share.test.js
│   ├── solvedMessage.test.js
│   ├── storage.test.js
│   ├── theme.test.js
│   ├── toast.test.js
│   └── toolbar.test.js
└── helpers/             # Shared test code, e.g. reading stickers off the 3D model
```

The cube has two sides that always agree. `CubeState` is the logical cube: it stores the color of all 54 stickers in the standard facelet format used by Kociemba solvers, and it is the source of truth. `RubiksCube` is the 3D model: 26 cubelets on a 3×3×3 grid centered on the origin, each a rounded black body with a glossy sticker on every outer side. A move like `R` updates `CubeState` immediately, then `TurnAnimator` animates the 3D model to match by attaching that face's nine cubelets to a temporary pivot, rotating the pivot over a few frames (going slightly past the target and settling back, like a real cube), and snapping the cubelets back onto the grid. Moves requested mid-animation wait in a queue. `Cube` also keeps the history of moves for undo, redo, and reset, which plays the history backwards at high speed. Mouse turns are tested against an invisible box the size of the cube rather than the moving cubelets, so grabbing works even mid-turn, and the hit point maps straight onto the grid. The cube editor uses the same picking to paint stickers. A copied cube is loaded with `Cube.loadState`, which recolors the stickers and makes that cube the new starting point. `Cube.snapshot()` and `Cube.restore()` capture and bring back the whole cube (starting point, history, redo moves, scramble), and `cubeCode.js` writes a snapshot as a short line of text like `v=1&moves=RU2F'`. The same text is saved in the browser's localStorage and put after the `#` in shared links, so links never reach a server.

## Deployment

`npm run deploy` builds the site into `dist/` and publishes it to the `gh-pages` branch, which GitHub Pages serves. The `base` path in `vite.config.js` must match the repository name.

## License

MIT. See [LICENSE](LICENSE).
