import { describe, it, expect } from 'vitest';
import Cube from '../../src/cube/Cube.js';
import { SOLVED } from '../../src/cube/CubeState.js';
import { readFacelets } from '../helpers/readFacelets.js';

const FRAME_SECONDS = 1 / 60;

function finishAnimations(cube) {
    while (cube.animator.currentTurn || cube.animator.turnQueue.length > 0) {
        cube.update(FRAME_SECONDS);
    }
}

// A small seeded random generator so the sequence is the same on every run
function seededRandom(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

describe('Cube', () => {
    it('starts with the 3D model and the state both solved', () => {
        const cube = new Cube();
        expect(readFacelets(cube.model)).toBe(SOLVED);
        expect(cube.state.toString()).toBe(SOLVED);
    });

    it('updates the state immediately, and the 3D model once the animation finishes', () => {
        const cube = new Cube();
        cube.move('R');

        expect(cube.state.isSolved()).toBe(false);
        expect(readFacelets(cube.model)).toBe(SOLVED);

        finishAnimations(cube);
        expect(readFacelets(cube.model)).toBe(cube.state.toString());
    });

    for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) {
        it(`keeps the 3D model and the state in sync for ${face}, ${face}' and ${face}2`, () => {
            for (const notation of [face, `${face}'`, `${face}2`]) {
                const cube = new Cube();
                cube.move(notation);
                finishAnimations(cube);
                expect(readFacelets(cube.model), notation).toBe(cube.state.toString());
            }
        });
    }

    it('keeps the 3D model and the state in sync through a long random sequence', () => {
        const random = seededRandom(7);
        const faces = ['U', 'D', 'F', 'B', 'R', 'L'];
        const suffixes = ['', "'", '2'];
        const cube = new Cube();

        for (let i = 0; i < 200; i++) {
            cube.move(faces[Math.floor(random() * 6)] + suffixes[Math.floor(random() * 3)]);
            // Play some of the animation between moves, so moves also queue up mid-turn
            cube.update(random() * 0.1);
        }
        finishAnimations(cube);

        expect(readFacelets(cube.model)).toBe(cube.state.toString());
    });
});
