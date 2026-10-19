# Rubik's Cube Three.js Simulation

A browser-based 3D Rubik's Cube simulation built with Three.js and Vite. Rotate the cube with the keyboard and inspect it using the mouse.

[Open the live demo](https://michaeldjabauri.github.io/Rubik-s-Cube-Three.js-Simulation/)

## Run locally

Requirements: Node.js and npm.

```bash
git clone https://github.com/MichaelDjabauri/Rubik-s-Cube-Three.js-Simulation.git
cd Rubik-s-Cube-Three.js-Simulation/Frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). To create a production build, run `npm run build` from `Frontend`; the output is written to `Frontend/dist`.

## Controls

- Press `W`, `Y`, `G`, `B`, `R`, or `O` to rotate the white, yellow, green, blue, red, or orange face clockwise.
- Hold `Shift` while pressing a face key to rotate it counterclockwise.
- Drag with the mouse to orbit the camera; scroll to zoom.

## Planned features

- Add screen buttons and mouse controls for rotating cube faces.
- Make sure the ui is mobile friendly
- Add move undo and a reset to the solved state.
- Add a control to scramble the cube.
- Allow custom cube color configuration and validate whether a configuration is solvable.
- Add ability to solve Rubik's Cube using various solving algorithms.
- Display solutions step by step and animate them, with controls to move forward and backward through the steps.
- Explore additional solving algorithms and user interface improvements.

## Architecture

```text
Frontend/
├── index.html                 # Canvas and application entry point
├── vite.config.js             # Vite build output and GitHub Pages base path
└── src/
    ├── main.js                # Scene setup, animation loop, controls, input
    ├── Cube/
    │   ├── faces.js           # Face colors and the direction each face points
    │   ├── RubiksCube.js      # 26 colored cubelets and their geometry
    │   └── RotationHandler.js # Selects and animates face turns
    └── Utils/
        ├── Camera.js          # Perspective camera
        ├── Light.js           # Directional and ambient lights
        └── Renderer.js        # WebGL renderer attached to the canvas
```

`main.js` creates the Three.js scene, camera, renderer, lighting, cube, and orbit controls. `RubiksCube` builds the cube from corner, edge, and center cubelets. `RotationHandler` finds cubelets on a selected face and animates a quarter-turn around the corresponding axis. The current project is a frontend simulation; it does not include a solver or backend.

## Deployment

The Vite build is configured for the GitHub Pages project path. `npm run deploy` builds the app and publishes `Frontend/dist` using `gh-pages`.

## License

MIT. See [LICENSE](LICENSE).
