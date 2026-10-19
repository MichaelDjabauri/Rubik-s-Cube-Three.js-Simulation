import * as THREE from 'three';

// A bright directional "sun" for shading plus soft ambient light so no side is completely dark
export function createLights() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 10);
    directionalLight.position.set(-10, 10, 20);

    const ambientLight = new THREE.AmbientLight(0xffffff, 5);

    return [directionalLight, ambientLight];
}
