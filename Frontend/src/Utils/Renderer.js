import * as THREE from 'three';

export function getRenderer() {
    const canvas = document.querySelector('#c');
    
    return new THREE.WebGLRenderer({ antialias: true, canvas });
}
