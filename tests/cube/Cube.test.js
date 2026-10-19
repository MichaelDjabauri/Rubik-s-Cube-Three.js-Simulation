import { describe, it, expect } from 'vitest';
import Cube from '../../src/cube/Cube.js';
import CubeState, { SOLVED } from '../../src/cube/CubeState.js';
import { parseMoves, formatMoves } from '../../src/cube/notation.js';
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

describe('Cube history: undo, redo and reset', () => {
    function stateAfter(notation) {
        return new CubeState().applyMoves(parseMoves(notation)).toString();
    }

    function expectInSync(cube) {
        finishAnimations(cube);
        expect(readFacelets(cube.model)).toBe(cube.state.toString());
    }

    it('records moves in order', () => {
        const cube = new Cube();
        cube.move("R U'");
        cube.move('F2');
        expect(formatMoves(cube.history)).toBe("R U' F2");
    });

    it('undoes the last move in both the state and the 3D model', () => {
        const cube = new Cube();
        cube.move('R');
        expect(cube.undo()).toEqual({ face: 'R', turns: 1 });

        expect(cube.state.isSolved()).toBe(true);
        expectInSync(cube);
        expect(cube.canUndo).toBe(false);
    });

    it('walks back through a sequence one undo at a time', () => {
        const cube = new Cube();
        cube.move("R U2 F' L");

        cube.undo();
        expect(cube.state.toString()).toBe(stateAfter("R U2 F'"));
        cube.undo();
        expect(cube.state.toString()).toBe(stateAfter('R U2'));
        cube.undo();
        expect(cube.state.toString()).toBe(stateAfter('R'));
        expectInSync(cube);
    });

    it('does nothing when there is nothing to undo or redo', () => {
        const cube = new Cube();
        expect(cube.undo()).toBeNull();
        expect(cube.redo()).toBeNull();
        expect(cube.state.isSolved()).toBe(true);
        expect(cube.animator.turnQueue).toHaveLength(0);
    });

    it('stays in sync when undoing in the middle of an animation', () => {
        const cube = new Cube();
        cube.move("R U F'");
        cube.update(0.05);
        cube.undo();
        cube.update(0.05);
        cube.undo();

        expect(cube.state.toString()).toBe(stateAfter('R'));
        expectInSync(cube);
    });

    it('redoes undone moves in order', () => {
        const cube = new Cube();
        cube.move("R U2 F'");
        cube.undo();
        cube.undo();
        expect(cube.canRedo).toBe(true);

        expect(cube.redo()).toEqual({ face: 'U', turns: 2 });
        expect(cube.redo()).toEqual({ face: 'F', turns: -1 });
        expect(cube.canRedo).toBe(false);

        expect(cube.state.toString()).toBe(stateAfter("R U2 F'"));
        expect(formatMoves(cube.history)).toBe("R U2 F'");
        expectInSync(cube);
    });

    it('forgets the undone moves once a new move is made', () => {
        const cube = new Cube();
        cube.move('R U');
        cube.undo();
        cube.move('F');

        expect(cube.canRedo).toBe(false);
        expect(formatMoves(cube.history)).toBe('R F');
    });

    it('resets to solved and clears the history', () => {
        const cube = new Cube();
        cube.move("R U2 F' L D B2");
        cube.undo();
        cube.reset();

        expect(cube.state.isSolved()).toBe(true);
        expect(cube.canUndo).toBe(false);
        expect(cube.canRedo).toBe(false);
        expectInSync(cube);
        expect(readFacelets(cube.model)).toBe(SOLVED);
    });

    it('rewinds visibly, one move at a time, faster than normal turns', () => {
        const cube = new Cube();
        cube.move('R U F');
        finishAnimations(cube);
        cube.reset();

        expect(cube.animator.turnQueue).toHaveLength(3);
        cube.update(0.1); // Half the length of a normal turn
        expect(cube.animator.turnQueue.length + (cube.animator.currentTurn ? 1 : 0)).toBeLessThan(3);
        expectInSync(cube);
    });

    it('rewinds even a very long history in about 2 seconds', () => {
        const cube = new Cube();
        cube.move("R U R' U' ".repeat(150)); // 600 moves
        finishAnimations(cube);
        cube.reset();

        // 2 seconds of frames, plus a little slack for the last frame
        for (let frame = 0; frame < 2.1 * 60; frame++) {
            cube.update(FRAME_SECONDS);
        }
        expect(cube.animator.currentTurn).toBeNull();
        expect(cube.animator.turnQueue).toHaveLength(0);
        expect(readFacelets(cube.model)).toBe(SOLVED);
    });

    it('resets correctly in the middle of an animation', () => {
        const cube = new Cube();
        cube.move("R U2 F'");
        cube.update(0.05);
        cube.reset();

        expect(cube.state.isSolved()).toBe(true);
        expectInSync(cube);
        expect(readFacelets(cube.model)).toBe(SOLVED);
    });
});

describe('Cube scramble', () => {
    it('mixes up the cube, remembers the scramble, and keeps the 3D model in sync', () => {
        const cube = new Cube();
        const scramble = cube.scramble(seededRandom(3));

        expect(cube.lastScramble).toBe(scramble);
        expect(cube.state.isSolved()).toBe(false);
        expect(cube.state.toString()).toBe(new CubeState().applyMoves(parseMoves(scramble)).toString());
        finishAnimations(cube);
        expect(readFacelets(cube.model)).toBe(cube.state.toString());
    });

    it('plays the scramble quickly, in about 2 seconds', () => {
        const cube = new Cube();
        cube.scramble(seededRandom(3));
        for (let frame = 0; frame < 2.1 * 60; frame++) {
            cube.update(FRAME_SECONDS);
        }
        expect(cube.animator.currentTurn).toBeNull();
        expect(cube.animator.turnQueue).toHaveLength(0);
    });

    it('adds the scramble to the history, so undo steps back through it', () => {
        const cube = new Cube();
        const scramble = cube.scramble(seededRandom(3));
        expect(formatMoves(cube.history)).toBe(scramble);

        cube.undo();
        const withoutLastMove = parseMoves(scramble).slice(0, -1);
        expect(cube.state.toString()).toBe(new CubeState().applyMoves(withoutLastMove).toString());
    });

    it('can be reset back to solved, which also clears the scramble', () => {
        const cube = new Cube();
        cube.move('R U');
        cube.scramble(seededRandom(3));
        cube.reset();

        expect(cube.state.isSolved()).toBe(true);
        expect(cube.lastScramble).toBeNull();
        finishAnimations(cube);
        expect(readFacelets(cube.model)).toBe(SOLVED);
    });
});
