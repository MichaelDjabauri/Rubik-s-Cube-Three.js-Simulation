import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCamera } from './scene/camera.js';
import { createRenderer } from './scene/renderer.js';
import { createLights } from './scene/lights.js';
import Cube from './cube/Cube.js';

// Scene, camera, renderer and lights
const scene = new THREE.Scene();
const camera = createCamera();
const renderer = createRenderer();
scene.add(...createLights());

// The cube: its logical state plus the 3D model that animates its turns
const cube = new Cube();
scene.add(cube.model);

// Mouse controls: drag to orbit the camera, scroll to zoom
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Keyboard uses standard notation: a face's letter turns it clockwise, Shift + letter counterclockwise.
// U up, D down, F front, B back, R right, L left. Which color is on which face is listed in cube/faces.js.
const FACE_KEYS = new Set(['U', 'D', 'F', 'B', 'R', 'L']);

document.addEventListener('keydown', (event) => {
    const face = event.key.toUpperCase();

    // Ignore other keys, and auto-repeat from a held key so it doesn't flood the turn queue
    if (!FACE_KEYS.has(face) || event.repeat) {
        return;
    }

    cube.move(event.shiftKey ? `${face}'` : face);
});

// Keep the view undistorted when the window is resized
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

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
