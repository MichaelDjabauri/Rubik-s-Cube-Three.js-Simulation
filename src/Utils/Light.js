import * as THREE from 'three';

export function getDirectionalLight() {
    const color = 0xFFFFFF;
    const intensity = 10;
    let light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-10, 10, 20);

    return light
}

export function getAmbientLight() {
    const color = 0xFFFFFF;
    const intensity = 5;
    let light = new THREE.AmbientLight(color, intensity);

    return light
}