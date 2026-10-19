import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getCamera } from './Utils/Camera.js';
import { getRenderer } from './Utils/Renderer.js';
import { getDirectionalLight, getAmbientLight } from './Utils/Light.js';
import RubiksCube from './Cube/RubiksCube.js';
import RotationHandler from './Cube/RotationHandler.js';

// Scene, camera, renderer and lights
const scene = new THREE.Scene();
const camera = getCamera();
const renderer = getRenderer();
scene.add(getDirectionalLight(), getAmbientLight());

// The cube and the handler that animates its face turns
const rubiksCube = new RubiksCube();
scene.add(rubiksCube);
const rotationHandler = new RotationHandler(rubiksCube);

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

    rotationHandler.rotateFace(color, event.shiftKey ? 'counterclockwise' : 'clockwise');
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
    rotationHandler.update(clock.getDelta());
    controls.update();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
