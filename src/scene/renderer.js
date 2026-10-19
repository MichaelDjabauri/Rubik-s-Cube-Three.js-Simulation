import * as THREE from 'three';

export function createRenderer() {
    const canvas = document.querySelector('#c');
    // Transparent, so the page's backdrop (a CSS gradient in index.html) shows behind the cube
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas });

    // Render at the screen's real pixel density so the cube stays sharp on high-resolution displays
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Soft shadows (see the key light in lights.js), and tone mapping that keeps the sticker colors true
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping;

    return renderer;
}
