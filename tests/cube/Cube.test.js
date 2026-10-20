import { describe, it, expect } from 'vitest';
import Cube from '../../src/cube/Cube.js';
import CubeState, { SOLVED } from '../../src/cube/CubeState.js';
import { parseMoves, formatMoves, invertMoves } from '../../src/cube/notation.js';
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

describe('Cube loadState (a copied cube)', () => {
    const copied = () => new CubeState().applyMoves(parseMoves("R U2 F' L D B2 R' U")).toString();

    it('shows the loaded cube and starts a fresh history', () => {
        const cube = new Cube();
        cube.scramble(seededRandom(1));
        cube.update(0.1); // Part-way through the scramble animation
        cube.loadState(copied());

        expect(cube.state.toString()).toBe(copied());
        expect(readFacelets(cube.model)).toBe(copied());
        expect(cube.history).toEqual([]);
        expect(cube.canRedo).toBe(false);
        expect(cube.lastScramble).toBeNull();
        expect(cube.animator.turnQueue).toHaveLength(0);
        expect(cube.animator.pivot.children).toHaveLength(0);
    });

    it('keeps the state and the 3D model in sync for moves after loading', () => {
        const cube = new Cube();
        cube.loadState(copied());
        cube.move("F R' D2 L U'");
        finishAnimations(cube);
        expect(readFacelets(cube.model)).toBe(cube.state.toString());
    });

    it('resets back to the loaded cube, not to solved', () => {
        const cube = new Cube();
        cube.loadState(copied());
        cube.move('R U');
        cube.reset();
        finishAnimations(cube);
        expect(cube.state.toString()).toBe(copied());
        expect(readFacelets(cube.model)).toBe(copied());
    });

    it('remembers that it starts from a copied cube', () => {
        const cube = new Cube();
        expect(cube.startsFromCopy).toBe(false);
        cube.loadState(copied());
        expect(cube.startsFromCopy).toBe(true);
    });
});

describe('Cube resetToSolved (leaving a copied cube)', () => {
    const copied = () => new CubeState().applyMoves(parseMoves("R U2 F' L D B2 R' U")).toString();

    it('goes straight to a solved cube, as a normal starting point again', () => {
        const cube = new Cube();
        cube.loadState(copied());
        cube.move('R U');
        cube.undo();
        cube.resetToSolved();

        expect(cube.state.isSolved()).toBe(true);
        expect(readFacelets(cube.model)).toBe(SOLVED);
        expect(cube.startsFromCopy).toBe(false);
        expect(cube.canUndo).toBe(false);
        expect(cube.canRedo).toBe(false);
    });

    it('stops any turn that is still animating', () => {
        const cube = new Cube();
        cube.loadState(copied());
        cube.move("R U F'");
        cube.update(0.05);
        cube.resetToSolved();

        expect(cube.animator.currentTurn).toBeNull();
        expect(cube.animator.turnQueue).toHaveLength(0);
        expect(readFacelets(cube.model)).toBe(SOLVED);
    });

    it('afterwards, reset rewinds to solved again', () => {
        const cube = new Cube();
        cube.loadState(copied());
        cube.resetToSolved();
        cube.move("R U'");
        cube.reset();
        finishAnimations(cube);
        expect(readFacelets(cube.model)).toBe(SOLVED);
    });
});

describe('Cube onSolved (celebrating the user solving the cube)', () => {
    // Watches for celebrations, and returns the move count of each one
    function watch(cube) {
        const solves = [];
        cube.onSolved = moveCount => solves.push(moveCount);
        return solves;
    }

    // The moves that undo a scramble, written as notation
    function undoing(scramble) {
        return formatMoves(invertMoves(parseMoves(scramble)));
    }

    it('celebrates when the user solves a scramble, with the number of moves they made', () => {
        const cube = new Cube();
        const solves = watch(cube);
        const scramble = cube.scramble(seededRandom(5));

        cube.move('R');
        cube.move("R'");
        cube.move(undoing(scramble));

        expect(solves).toEqual([2 + 25]);
    });

    it('celebrates when the user solves a copied cube', () => {
        const cube = new Cube();
        const solves = watch(cube);
        cube.loadState(new CubeState().applyMoves(parseMoves("R U'")).toString());
        cube.move('U');
        cube.move("R'");
        expect(solves).toEqual([2]);
    });

    it('celebrates only once per solve', () => {
        const cube = new Cube();
        const solves = watch(cube);
        cube.move(undoing(cube.scramble(seededRandom(5))));
        cube.move('R');
        cube.move("R'");
        expect(solves).toHaveLength(1);
    });

    it('solves fine when nobody is listening for celebrations', () => {
        const cube = new Cube();
        cube.move(undoing(cube.scramble(seededRandom(5))));
        expect(cube.state.isSolved()).toBe(true);
        expect(cube.currentSolve).toBeNull();
    });

    it("doesn't celebrate turning a solved cube and turning it back", () => {
        const cube = new Cube();
        const solves = watch(cube);
        cube.move("R R'");
        expect(solves).toEqual([]);
    });

    it("doesn't celebrate when undo, redo or reset return to solved", () => {
        const cube = new Cube();
        const solves = watch(cube);
        cube.scramble(seededRandom(5));
        cube.reset();
        expect(solves).toEqual([]);

        cube.move('R');
        cube.undo();
        cube.redo();
        cube.undo();
        expect(solves).toEqual([]);
    });

    it("doesn't celebrate after leaving a copied cube with Solved cube", () => {
        const cube = new Cube();
        const solves = watch(cube);
        cube.loadState(new CubeState().applyMoves(parseMoves('R')).toString());
        cube.resetToSolved();
        cube.move("R R'");
        expect(solves).toEqual([]);
    });

    it("doesn't celebrate loading a copied cube that is already solved", () => {
        const cube = new Cube();
        const solves = watch(cube);
        cube.loadState(SOLVED);
        cube.move("R R'");
        expect(solves).toEqual([]);
    });

    it('lets the user solve a copied cube again after reset rewinds to it', () => {
        const cube = new Cube();
        const solves = watch(cube);
        cube.loadState(new CubeState().applyMoves(parseMoves('R')).toString());
        cube.move("R'");
        cube.reset();
        cube.move("R'");
        expect(solves).toEqual([1, 1]);
    });
});

describe('Cube snapshot and restore', () => {
    it('brings back the stickers, history, redo moves, scramble and solve straight away', () => {
        const original = new Cube();
        original.scramble(seededRandom(3));
        original.move("R U'");
        original.undo();

        const restored = new Cube();
        restored.restore(original.snapshot());

        expect(restored.state.toString()).toBe(original.state.toString());
        expect(readFacelets(restored.model)).toBe(original.state.toString()); // No animation needed
        expect(restored.animator.isBusy).toBe(false);
        expect(restored.history).toEqual(original.history);
        expect(restored.redoStack).toEqual(original.redoStack);
        expect(restored.lastScramble).toBe(original.lastScramble);
        expect(restored.currentSolve).toEqual(original.currentSolve);
        expect(restored.snapshot()).toEqual(original.snapshot());
    });

    it('keeps a copied cube as the starting point, so reset rewinds to it', () => {
        const start = new CubeState().applyMoves(parseMoves("R U'")).toString();
        const original = new Cube();
        original.loadState(start);
        original.move('F');

        const restored = new Cube();
        restored.restore(original.snapshot());
        expect(restored.startsFromCopy).toBe(true);
        expect(restored.snapshot().start).toBe(start);

        restored.reset();
        finishAnimations(restored);
        expect(restored.state.toString()).toBe(start);
        expect(readFacelets(restored.model)).toBe(start);
    });

    it('has no starting stickers in the snapshot when the cube started solved', () => {
        const cube = new Cube();
        cube.move('R');
        expect(cube.snapshot()).toEqual({ start: null, history: parseMoves('R'), redo: [], scramble: null, solveMoveCount: null });
    });

    it('celebrates a restored solve with the moves counted before and after', () => {
        const original = new Cube();
        original.loadState(new CubeState().applyMoves(parseMoves('R U')).toString());
        original.move("U'");

        const restored = new Cube();
        restored.restore(original.snapshot());
        const solves = [];
        restored.onSolved = moveCount => solves.push(moveCount);
        restored.move("R'");
        expect(solves).toEqual([2]);
    });

    it('leaves a copied cube for a solved one after resetToSolved', () => {
        const cube = new Cube();
        cube.loadState(new CubeState().applyMoves(parseMoves('R')).toString());
        cube.resetToSolved();
        expect(cube.snapshot().start).toBeNull();
        expect(cube.startFacelets).toBe(SOLVED);
    });
});
