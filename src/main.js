import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCamera, fitCamera, CUBE_RADIUS } from './scene/camera.js';
import { createRenderer } from './scene/renderer.js';
import { createLights } from './scene/lights.js';
import Cube from './cube/Cube.js';
import { commandForKey } from './input/keyboard.js';
import { setUpMouseTurns } from './input/mouse.js';
import { createToolbar } from './ui/toolbar.js';
import { createMoveButtons } from './ui/moveButtons.js';

// Scene, camera, renderer and lights
const scene = new THREE.Scene();
const camera = createCamera();
const renderer = createRenderer();
scene.add(...createLights());

// The cube: its logical state plus the 3D model that animates its turns
const cube = new Cube();
scene.add(cube.model);

// Camera controls: drag the background to orbit, scroll to zoom
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Commands come from the keyboard, the mouse and the buttons, e.g. { type: 'move', notation: "R'" } or { type: 'undo' }
const toolbar = createToolbar(runCommand);
toolbar.update(cube);
createMoveButtons(runCommand, notation => cube.model.highlightFace(notation));
setUpMouseTurns({ camera, canvas: renderer.domElement, cubeModel: cube.model, controls, onCommand: runCommand });

function runCommand(command) {
    if (command.type === 'move') {
        cube.move(command.notation);
    } else if (command.type === 'scramble') {
        cube.scramble();
    } else if (command.type === 'undo') {
        cube.undo();
    } else if (command.type === 'redo') {
        cube.redo();
    } else if (command.type === 'reset') {
        cube.reset();
    }
    toolbar.update(cube);
}

// Keyboard: face letters in standard notation, Ctrl+Z to undo, Ctrl+Shift+Z to redo (see input/keyboard.js)
document.addEventListener('keydown', (event) => {
    const command = commandForKey(event);
    if (!command) {
        return;
    }
    // Stop the browser from running its own action for the key, like its own undo
    event.preventDefault();
    runCommand(command);
});

// Fit the whole cube on screen, now and whenever the window changes size (e.g. a phone is turned).
// On upright phones the buttons cover the bottom of the screen (see the CSS in index.html),
// so the cube is fitted into, and centered in, the space above them.
const uprightPhoneLayout = window.matchMedia('(max-width: 700px)');

function fitCubeOnScreen() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const freeHeight = uprightPhoneLayout.matches
        ? document.querySelector('#move-buttons').getBoundingClientRect().top
        : height;
    const { distance, offsetY } = fitCamera({ fovDegrees: camera.fov, width, height, freeHeight });

    camera.aspect = width / height;
    if (offsetY > 0) {
        camera.setViewOffset(width, height, 0, offsetY, width, height);
    } else {
        camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();

    // Keep the current viewing angle, only change the distance
    camera.position.sub(controls.target).setLength(distance).add(controls.target);
    // Zoom limits: not inside the cube, and not so far away that it gets lost
    controls.minDistance = CUBE_RADIUS + 1;
    controls.maxDistance = distance * 2.5;

    renderer.setSize(width, height);
}

fitCubeOnScreen();
window.addEventListener('resize', fitCubeOnScreen);

// Render loop: runs once per screen refresh
const timer = new THREE.Timer();
// Pause the timer while the tab is hidden, so coming back doesn't count as one huge frame
timer.connect(document);

function animate(timestamp) {
    timer.update(timestamp);
    cube.update(timer.getDelta());
    controls.update();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
