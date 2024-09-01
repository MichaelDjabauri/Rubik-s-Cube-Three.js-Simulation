import { getCamera } from './Utils/Camera.js';
import { getRenderer } from './Utils/Renderer.js';
import RubiksCube from './Cube/RubiksCube.js';
import RotationHandler from './Cube/RotationHandler.js';
import { getDirectionalLight, getAmbientLight } from './Utils/Light.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = getCamera();
const renderer = getRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const directionalLight = getDirectionalLight();
const ambientLight = getAmbientLight();
scene.add(directionalLight, ambientLight);

const rubiksCube = new RubiksCube();
const rotationHandler = new RotationHandler(scene, rubiksCube);

rubiksCube.allSubCubes.forEach(subCube =>
    scene.add(subCube)
)

function animate() {
    controls.update();
    renderer.render(scene, camera);
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'w' || event.key === 'W') {
        const direction = event.shiftKey ? 'counterclockwise' : 'clockwise';
        rotationHandler.rotateWhiteFace(direction);
    }
});
