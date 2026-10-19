import * as THREE from 'three';
import { faceletIndex } from '../cube/CubeState.js';

// Finds which sticker is under the pointer. Shared by turning layers (mouse.js) and painting stickers (the cube editor).
export function createStickerPicker({ camera, canvas, cubeModel }) {
    // An invisible box the size of the whole cube. Picks are tested against it rather than the
    // cubelets: it never moves, so picking works even mid-turn, and the hit point maps straight onto the grid.
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshBasicMaterial({ visible: false }));
    cubeModel.add(hitBox);

    const raycaster = new THREE.Raycaster();

    return {
        // The sticker under the pointer, or null if the pointer misses the cube:
        //   point          where the pointer touches the cube, as a Vector3 in the cube's own space
        //   normal         the direction the touched face points, e.g. [0, 0, 1] for the front
        //   cell           the touched sticker's cubelet position on the grid, e.g. [0, 1, 1]
        //   faceletIndex   the touched sticker's index in CubeState's layout
        pick(event) {
            const rect = canvas.getBoundingClientRect();
            const pointer = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            );
            raycaster.setFromCamera(pointer, camera);
            const hit = raycaster.intersectObject(hitBox)[0];
            if (!hit) {
                return null;
            }

            const point = cubeModel.worldToLocal(hit.point.clone());
            const normal = hit.face.normal.toArray();
            // 1 or -1 along the face's normal, and the rounded hit point along the other axes
            const cell = point.toArray().map((value, axis) =>
                normal[axis] !== 0 ? normal[axis] : THREE.MathUtils.clamp(Math.round(value), -1, 1)
            );

            return { point, normal, cell, faceletIndex: faceletIndex(cell, normal) };
        }
    };
}
