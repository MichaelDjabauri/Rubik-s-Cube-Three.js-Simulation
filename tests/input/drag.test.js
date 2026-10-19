import { describe, it, expect } from 'vitest';
import { inPlaneAxes, closestAxis, moveForDrag } from '../../src/input/drag.js';
import CubeState, { faceletIndex, faceletLocation } from '../../src/cube/CubeState.js';
import { parseMove } from '../../src/cube/notation.js';

const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

// The 9 grid cells of the stickers on a face
function cellsOnFace(normal) {
    const cells = [];
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const cell = [x, y, z];
                if (cell.every((value, axis) => normal[axis] === 0 || value === normal[axis])) {
                    cells.push(cell);
                }
            }
        }
    }
    return cells;
}

describe('inPlaneAxes', () => {
    it('gives the four directions lying flat on a face', () => {
        expect(inPlaneAxes([0, 0, 1])).toEqual([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]);
    });
});

describe('closestAxis', () => {
    const frontView = [
        { axis: [1, 0, 0], screen: [40, 0] },
        { axis: [-1, 0, 0], screen: [-40, 0] },
        { axis: [0, 1, 0], screen: [0, -40] }, // Up in the scene is up on screen, which is -y in pixels
        { axis: [0, -1, 0], screen: [0, 40] }
    ];

    it('picks the direction the drag points in', () => {
        expect(closestAxis([30, 2], frontView)).toEqual([1, 0, 0]);
        expect(closestAxis([-25, 5], frontView)).toEqual([-1, 0, 0]);
        expect(closestAxis([3, -20], frontView)).toEqual([0, 1, 0]);
        expect(closestAxis([-4, 18], frontView)).toEqual([0, -1, 0]);
    });

    it('goes by direction, not by how long each direction looks on screen', () => {
        const tilted = [{ axis: [1, 0, 0], screen: [100, 0] }, { axis: [0, 1, 0], screen: [0, -5] }];
        expect(closestAxis([3, -20], tilted)).toEqual([0, 1, 0]);
    });
});

describe('moveForDrag', () => {
    it('turns U counterclockwise when the top row of the front face is dragged right', () => {
        expect(moveForDrag([0, 0, 1], [0, 1, 1], [1, 0, 0])).toBe("U'");
    });

    it('turns R clockwise when the right column of the front face is dragged up', () => {
        expect(moveForDrag([0, 0, 1], [1, 0, 1], [0, 1, 0])).toBe('R');
    });

    it('turns F clockwise when the front edge of the top face is dragged right', () => {
        expect(moveForDrag([0, 1, 0], [0, 1, 1], [1, 0, 0])).toBe('F');
    });

    it('ignores drags that would turn a middle layer, including every drag on a center sticker', () => {
        expect(moveForDrag([0, 0, 1], [0, 1, 1], [0, 1, 0])).toBeNull();
        for (const normal of NORMALS) {
            for (const axis of inPlaneAxes(normal)) {
                expect(moveForDrag(normal, normal, axis)).toBeNull();
            }
        }
    });

    // Ties the drag math to the real cube: for every sticker on every face, in every drag direction,
    // the chosen move must carry the grabbed sticker the way it was dragged
    it('moves the grabbed sticker in the drag direction, for every sticker and direction', () => {
        let checked = 0;

        for (const normal of NORMALS) {
            for (const cell of cellsOnFace(normal)) {
                for (const axis of inPlaneAxes(normal)) {
                    const notation = moveForDrag(normal, cell, axis);
                    if (!notation) {
                        continue;
                    }

                    // Label every sticker with its own index, apply the move, and find where the grabbed one went
                    const grabbed = faceletIndex(cell, normal);
                    const labels = Array.from({ length: 54 }, (_, index) => index);
                    const state = new CubeState(labels).applyMove(parseMove(notation));
                    const newLocation = faceletLocation(state.facelets.indexOf(grabbed));

                    // A quarter turn that carries a sticker along `axis` tips it over the edge to face that way
                    expect(newLocation.normal, `${notation} from ${cell} dragged ${axis}`).toEqual(axis);
                    checked++;
                }
            }
        }

        // Per face: 4 corner stickers can be dragged 4 ways, and 4 edge stickers 2 ways
        // (their other 2 directions would turn a middle layer). 6 faces x 24 = 144.
        expect(checked).toBe(144);
    });
});
