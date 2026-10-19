import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Where the floor that catches the cube's shadow sits, a little below the cube
const FLOOR_Y = -2.2;
// The floor is a disc this big; the key light's shadow box covers all of it
const FLOOR_RADIUS = 4;

// A soft studio setup: a key light from above that casts the shadow, fill lights from the right and the
// left so no side is left dark, a rim light from behind that outlines the cube, and a dim sky-and-ground light
export function createLights() {
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-2, 10, 3);
    key.castShadow = true;
    // The shadow only needs to cover the area around the cube, so keep its box tight for a sharp map
    const shadowCamera = key.shadow.camera;
    shadowCamera.left = shadowCamera.bottom = -5;
    shadowCamera.right = shadowCamera.top = 5;
    shadowCamera.near = 1;
    shadowCamera.far = 30;
    key.shadow.mapSize.set(1024, 1024);
    // Blurs the shadow's edge (with renderer.shadowMap.type set to VSMShadowMap in renderer.js)
    key.shadow.radius = 16;
    key.shadow.blurSamples = 16;

    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(8, 2, 4);

    const leftFill = new THREE.DirectionalLight(0xffffff, 0.6);
    leftFill.position.set(-8, -1, -3);

    const rim = new THREE.DirectionalLight(0xffffff, 1);
    rim.position.set(2, 5, -9);

    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x606060, 0.3);

    return [key, fill, leftFill, rim, hemisphere];
}

// Soft reflections of a bright studio room all around the scene, which give the glossy stickers their shine.
// Kept dim enough that the sticker colors stay rich instead of washing out.
export function addEnvironment(scene, renderer) {
    const generator = new THREE.PMREMGenerator(renderer);
    scene.environment = generator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
    generator.dispose();
}

// An invisible floor under the cube that only shows the cube's shadow. It is one-sided and faces up,
// so it disappears when the camera looks at the cube from below.
export function createShadowFloor() {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(FLOOR_RADIUS, 48), new THREE.ShadowMaterial({ opacity: 0.3 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    return floor;
}
