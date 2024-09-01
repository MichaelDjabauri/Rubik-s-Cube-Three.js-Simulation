import * as THREE from 'three';

export function getCamera() {
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;

    let camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(3, 3, 5);

    return camera;
}