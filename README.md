# Rubik's Cube Three.js Simulation

A 3D Rubik's Cube that runs entirely in the browser, built with Three.js and Vite. Turn faces with the keyboard and orbit around the cube with the mouse.

[Open the live demo](https://michaeldjabauri.github.io/Rubik-s-Cube-Three.js-Simulation/)

## Run locally

Requirements: Node.js 18+ and npm.

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

The tests use [Vitest](https://vitest.dev) and live next to the code they test, in files ending in `.test.js`. They run in Node without a browser, because the cube logic doesn't depend on the page. They check that the cube is built correctly (26 cubelets, 9 stickers of each color, each on an outward-facing side) and that face turns behave correctly: each turn moves the right pieces in the right direction, turns queue up while one is animating, and a long scramble followed by its reverse returns the cube to solved.

## Controls

- Press `W`, `Y`, `G`, `B`, `R`, or `O` to turn the white, yellow, green, blue, red, or orange face clockwise.
- Hold `Shift` while pressing a face key to turn it counterclockwise.
- Drag with the mouse to orbit the camera; scroll to zoom.

## Planned features

Everything, including the solvers, will run in the browser.

- Undo, reset to the solved state, and scramble.
- On-screen buttons and mouse/touch dragging to turn faces, with a mobile-friendly layout.
- Enter a custom color configuration and check whether it is solvable.
- Solve the cube with several algorithms, from a beginner layer-by-layer method to Kociemba's two-phase algorithm.
- Step through solutions with animated forward and backward controls.

## Architecture

```text
index.html               # Canvas and application entry point
vite.config.js           # GitHub Pages base path
src/
├── main.js              # Wires everything together: scene, input, render loop
├── cube/
│   ├── faces.js         # Face colors and the direction each face points
│   ├── RubiksCube.js    # Builds the 26 colored cubelets as a THREE.Group
│   ├── TurnAnimator.js  # Queues and animates face turns
│   └── *.test.js        # Tests for the files above
└── scene/
    ├── camera.js        # Perspective camera
    ├── lights.js        # Directional and ambient lights
    └── renderer.js      # WebGL renderer attached to the canvas
```

The cube is a group of 26 cubelets on a 3×3×3 grid centered on the origin. To turn a face, `TurnAnimator` attaches that face's nine cubelets to a temporary pivot, rotates the pivot over a few frames, then snaps the cubelets back onto the grid. Turns requested mid-animation wait in a queue.

## Deployment

`npm run deploy` builds the site into `dist/` and publishes it to the `gh-pages` branch, which GitHub Pages serves. The `base` path in `vite.config.js` must match the repository name.

## License

MIT. See [LICENSE](LICENSE).
