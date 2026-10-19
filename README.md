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
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally, exactly as it will be published |
| `npm test` | Run the tests once |
| `npm run test:watch` | Rerun the tests every time a file changes |
| `npm run deploy` | Build and publish to GitHub Pages |

## Tests

The tests use [Vitest](https://vitest.dev) and live in `tests/`, which mirrors the folder structure of `src/`. For example, `src/cube/RubiksCube.js` is tested by `tests/cube/RubiksCube.test.js`. They run in Node without a browser, because the cube logic doesn't depend on the page. They cover reading and writing notation, the logical cube state (including known facts such as `R U` taking exactly 105 repeats to return to solved), building the 3D cube, animating turns, and a check that the 3D model and the logical state always end up showing the same stickers.

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
- Use the buttons at the bottom to scramble, undo, redo, or reset. Scramble plays 25 random moves and shows them at the top of the screen. Reset rewinds every move quickly back to the solved cube.

In written notation, a letter alone is a clockwise quarter turn, `'` (prime) makes it counterclockwise, and `2` makes it a half turn. For example, `R U R' U2` means: right clockwise, up clockwise, right counterclockwise, up half turn.

## Planned features

Everything, including the solvers, will run in the browser.

- A mobile-friendly layout with touch controls.
- Enter a custom color configuration and check whether it is solvable.
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
│   ├── RubiksCube.js    # 3D model: the 26 colored cubelets as a THREE.Group
│   └── TurnAnimator.js  # Queues and animates face turns on the 3D model
├── input/
│   ├── keyboard.js      # Turns key presses into commands like a move or undo
│   ├── drag.js          # The math for turning a layer by dragging a sticker
│   └── mouse.js         # Grabbing and dragging stickers with the mouse
├── ui/
│   ├── toolbar.js       # Scramble, Undo, Redo and Reset buttons, and the scramble text
│   └── moveButtons.js   # The face-turn buttons on the right
└── scene/
    ├── camera.js        # Perspective camera
    ├── lights.js        # Directional and ambient lights
    └── renderer.js      # WebGL renderer attached to the canvas
tests/                   # Mirrors src/, one test file per source file
├── cube/
│   ├── Cube.test.js
│   ├── CubeState.test.js
│   ├── notation.test.js
│   ├── scramble.test.js
│   ├── RubiksCube.test.js
│   └── TurnAnimator.test.js
├── input/
│   ├── drag.test.js
│   └── keyboard.test.js
└── helpers/             # Shared test code, e.g. reading stickers off the 3D model
```

The cube has two sides that always agree. `CubeState` is the logical cube: it stores the color of all 54 stickers in the standard facelet format used by Kociemba solvers, and it is the source of truth. `RubiksCube` is the 3D model: 26 cubelets on a 3×3×3 grid centered on the origin. A move like `R` updates `CubeState` immediately, then `TurnAnimator` animates the 3D model to match by attaching that face's nine cubelets to a temporary pivot, rotating the pivot over a few frames, and snapping the cubelets back onto the grid. Moves requested mid-animation wait in a queue. `Cube` also keeps the history of moves for undo, redo, and reset, which plays the history backwards at high speed. Mouse turns are tested against an invisible box the size of the cube rather than the moving cubelets, so grabbing works even mid-turn, and the hit point maps straight onto the grid.

## Deployment

`npm run deploy` builds the site into `dist/` and publishes it to the `gh-pages` branch, which GitHub Pages serves. The `base` path in `vite.config.js` must match the repository name.

## License

MIT. See [LICENSE](LICENSE).
