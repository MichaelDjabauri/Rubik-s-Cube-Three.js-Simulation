import { FACES } from '../../src/cube/faces.js';
import { faceletIndex } from '../../src/cube/CubeState.js';

// Reads the 54 stickers off the 3D model, in the same format as CubeState.toString().
// Each sticker's letter comes from its actual color, so recolored cubes (loaded with loadState) read correctly.
// Unpainted stickers read as '?'. Only valid when no turn is animating.
export function readFacelets(rubiksCube) {
    const facelets = new Array(54).fill('?');

    for (const cubelet of rubiksCube.cubelets) {
        cubelet.material.forEach((material, side) => {
            // Side i of a cubelet starts out pointing along FACES[i].normal.
            // Rotating that direction by the cubelet's current orientation shows where the sticker points now.
            const direction = FACES[side].normal.clone().applyQuaternion(cubelet.quaternion).round();
            if (cubelet.position.dot(direction) !== 1) {
                return; // An inner side
            }
            const face = FACES.find(candidate => candidate.hex === `#${material.color.getHexString()}`);
            if (face) {
                facelets[faceletIndex(cubelet.position.toArray(), direction.toArray())] = face.notation;
            }
        });
    }

    return facelets.join('');
}
