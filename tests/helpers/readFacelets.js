import { FACES } from '../../src/cube/faces.js';
import { faceletIndex } from '../../src/cube/CubeState.js';

const BLACK = '000000';

// Reads the 54 stickers off the 3D model, in the same format as CubeState.toString().
// Only valid when no turn is animating.
export function readFacelets(rubiksCube) {
    const facelets = new Array(54);

    for (const cubelet of rubiksCube.cubelets) {
        cubelet.material.forEach((material, side) => {
            if (material.color.getHexString() === BLACK) {
                return;
            }
            // Side i of a cubelet starts out pointing along FACES[i].normal and carries that face's color.
            // Rotating that direction by the cubelet's current orientation shows where the sticker points now.
            const direction = FACES[side].normal.clone().applyQuaternion(cubelet.quaternion).round();
            const index = faceletIndex(cubelet.position.toArray(), direction.toArray());
            facelets[index] = FACES[side].notation;
        });
    }

    return facelets.join('');
}
