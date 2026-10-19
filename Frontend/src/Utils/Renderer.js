import * as THREE from 'three';

export function getRenderer() {
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

    // Render at the screen's real pixel density so the cube stays sharp on high-resolution displays
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    return renderer;
}
