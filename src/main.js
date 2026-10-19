import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCamera } from './scene/camera.js';
import { createRenderer } from './scene/renderer.js';
import { createLights } from './scene/lights.js';
import RubiksCube from './cube/RubiksCube.js';
import TurnAnimator from './cube/TurnAnimator.js';

// Scene, camera, renderer and lights
const scene = new THREE.Scene();
const camera = createCamera();
const renderer = createRenderer();
scene.add(...createLights());

// The cube and the animator that plays its face turns
const rubiksCube = new RubiksCube();
scene.add(rubiksCube);
const turnAnimator = new TurnAnimator(rubiksCube);

// Mouse controls: drag to orbit the camera, scroll to zoom
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Keyboard: a face's key turns it clockwise, Shift + key turns it counterclockwise
const FACE_KEYS = { w: 'white', y: 'yellow', g: 'green', b: 'blue', r: 'red', o: 'orange' };

document.addEventListener('keydown', (event) => {
    const color = FACE_KEYS[event.key.toLowerCase()];

    // Ignore other keys, and auto-repeat from a held key so it doesn't flood the turn queue
    if (!color || event.repeat) {
        return;
    }

    turnAnimator.rotateFace(color, event.shiftKey ? 'counterclockwise' : 'clockwise');
});

// Keep the view undistorted when the window is resized
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop: runs once per screen refresh
const clock = new THREE.Clock();

function animate() {
    turnAnimator.update(clock.getDelta());
    controls.update();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
