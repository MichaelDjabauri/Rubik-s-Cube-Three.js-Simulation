import * as THREE from 'three';

// The six faces of the solved cube: their color, their name in standard notation, and the direction they point.
// Listed in the order BoxGeometry assigns materials to sides: +x, -x, +y, -y, +z, -z.
export const FACES = [
    { notation: 'R', color: 'green', hex: '#009b48', normal: new THREE.Vector3(1, 0, 0) },   // Right
    { notation: 'L', color: 'blue', hex: '#0046ad', normal: new THREE.Vector3(-1, 0, 0) },   // Left
    { notation: 'U', color: 'red', hex: '#b71234', normal: new THREE.Vector3(0, 1, 0) },     // Up
    { notation: 'D', color: 'orange', hex: '#ff5800', normal: new THREE.Vector3(0, -1, 0) }, // Down
    { notation: 'F', color: 'white', hex: '#ffffff', normal: new THREE.Vector3(0, 0, 1) },   // Front
    { notation: 'B', color: 'yellow', hex: '#ffd500', normal: new THREE.Vector3(0, 0, -1) }  // Back
];
