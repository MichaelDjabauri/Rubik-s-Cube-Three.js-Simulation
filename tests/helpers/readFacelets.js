import { FACES } from '../../src/cube/faces.js';
import { faceletIndex } from '../../src/cube/CubeState.js';

// Reads the 54 stickers off the 3D model, in the same format as CubeState.toString().
// Each sticker's letter comes from its actual color, so recolored cubes (loaded with loadState) read correctly.
// Unpainted stickers read as '?'. Only valid when no turn is animating.
export function readFacelets(rubiksCube) {
    const facelets = new Array(54).fill('?');

    for (const cubelet of rubiksCube.cubelets) {
        for (const sticker of cubelet.userData.stickers) {
            // A sticker starts out pointing along its side's normal, FACES[side].normal.
            // Rotating that direction by the cubelet's current orientation shows where the sticker points now.
            const direction = FACES[sticker.userData.side].normal.clone().applyQuaternion(cubelet.quaternion).round();
            const face = FACES.find(candidate => candidate.hex === `#${sticker.material.color.getHexString()}`);
            if (face) {
                facelets[faceletIndex(cubelet.position.toArray(), direction.toArray())] = face.notation;
            }
        }
    }

    return facelets.join('');
}
