import * as THREE from 'three';

// The six faces of the solved cube: their color and the direction they point.
// Listed in the order BoxGeometry assigns materials to sides: +x, -x, +y, -y, +z, -z.
export const FACES = [
    { color: 'green', hex: '#009b48', normal: new THREE.Vector3(1, 0, 0) },   // Right
    { color: 'blue', hex: '#0046ad', normal: new THREE.Vector3(-1, 0, 0) },   // Left
    { color: 'red', hex: '#b71234', normal: new THREE.Vector3(0, 1, 0) },     // Top
    { color: 'orange', hex: '#ff5800', normal: new THREE.Vector3(0, -1, 0) }, // Bottom
    { color: 'white', hex: '#ffffff', normal: new THREE.Vector3(0, 0, 1) },   // Front
    { color: 'yellow', hex: '#ffd500', normal: new THREE.Vector3(0, 0, -1) }  // Back
];
