import { describe, it, expect, vi, beforeAll } from 'vitest';
import { solveCube, simplify, STAGE_NAMES } from '../../src/cube/solver.js';
import CubeState, { SOLVED, faceletLocation } from '../../src/cube/CubeState.js';
import { parseMoves, formatMoves } from '../../src/cube/notation.js';
import { generateScramble } from '../../src/cube/scramble.js';

// A small seeded random generator so the cubes are the same on every run
function seededRandom(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

function scrambled(notation) {
    return new CubeState().applyMoves(parseMoves(notation));
}

// The white face is F in the app, so the cross's stickers are F's edges and their side neighbors
const WHITE_EDGE_STICKERS = [[19, 7], [21, 41], [23, 12], [25, 28]];

// The first solve builds the white cross table, which is slow while coverage is being measured
beforeAll(() => solveCube(SOLVED), 60000);

describe('solveCube', () => {
    it('solves a cube one move away', () => {
        for (const notation of ['R', "U'", 'F2', 'B', "L'", 'D2']) {
            const cube = scrambled(notation);
            const { moves } = solveCube(cube.facelets);
            expect(cube.applyMoves(moves).isSolved(), notation).toBe(true);
        }
    });

    it('returns no moves for a solved cube, with every stage named', () => {
        const { stages, moves } = solveCube(SOLVED);
        expect(moves).toEqual([]);
        expect(stages.map(stage => stage.name)).toEqual(STAGE_NAMES);
    });

    // A slow test: about a second normally, much longer while measuring coverage
    it('solves a hundred random scrambles, in a reasonable number of moves', { timeout: 60000 }, () => {
        const random = seededRandom(2026);
        let longest = 0;
        for (let i = 0; i < 100; i++) {
            const cube = scrambled(generateScramble(25, random));
            const { stages, moves } = solveCube(cube.toString());
            expect(stages.flatMap(stage => stage.moves)).toEqual(moves);
            expect(cube.applyMoves(moves).isSolved()).toBe(true);
            longest = Math.max(longest, moves.length);
        }
        expect(longest).toBeLessThan(220);
    });

    it('solves the white cross first, in at most 8 moves, and keeps it through the next stages', () => {
        const random = seededRandom(7);
        for (let i = 0; i < 30; i++) {
            const cube = scrambled(generateScramble(25, random));
            const { stages } = solveCube(cube.facelets);
            expect(stages[0].moves.length).toBeLessThanOrEqual(8);

            for (const stage of stages.slice(0, 6)) {
                cube.applyMoves(stage.moves);
                for (const [white, side] of WHITE_EDGE_STICKERS) {
                    expect(cube.facelets[white]).toBe('F');
                    expect(cube.facelets[side]).toBe(SOLVED[side]);
                }
            }
        }
    });

    it('finishes each layer in its stage: the white layer after stage 2, two layers after stage 3', () => {
        const cube = scrambled("R U2 F' L D B2 R' U F2 L' D' B U2");
        const { stages } = solveCube(cube.facelets);
        // White is the front (+z), so the layers count back from z = 1
        const solvedFrom = z => [...Array(54).keys()]
            .filter(index => faceletLocation(index).position[2] >= z)
            .every(index => cube.facelets[index] === SOLVED[index]);
        cube.applyMoves([...stages[0].moves, ...stages[1].moves]);
        expect(solvedFrom(1)).toBe(true);
        cube.applyMoves(stages[2].moves);
        expect(solvedFrom(0)).toBe(true);
    });

    it('solves a colored-in cube too', () => {
        const colored = scrambled("F R' D2 B L U'").toString();
        const { moves } = solveCube(colored);
        expect(new CubeState(colored).applyMoves(moves).isSolved()).toBe(true);
    });

    it('refuses stickers that are not a real cube', () => {
        const twisted = [...SOLVED];
        [twisted[8], twisted[9]] = [twisted[9], twisted[8]];
        expect(() => solveCube(twisted.join(''))).toThrow('not a real cube');
    });
});

describe('simplify', () => {
    it('joins turns of the same face', () => {
        const cases = [["R R", 'R2'], ["R R'", ''], ["R2 R", "R'"], ["R' R'", 'R2'], ["U R R' U", 'U2'], ['R L R', 'R L R']];
        for (const [before, after] of cases) {
            expect(formatMoves(simplify(parseMoves(before))), before).toBe(after);
        }
    });
});

describe('solveCube safety checks', () => {
    // These can't happen with a real cube. Letting impossible cubes past the check shows that the solver
    // stops with an error instead of showing a wrong answer.
    async function solverWithoutCheck() {
        vi.resetModules();
        vi.doMock('../../src/cube/validate.js', () => ({ validateFacelets: () => ({ valid: true, problems: [] }) }));
        const module = await import('../../src/cube/solver.js');
        vi.doUnmock('../../src/cube/validate.js');
        return module.solveCube;
    }

    function withSwapped(cycle) {
        const facelets = [...SOLVED];
        const colors = cycle.map(index => facelets[index]);
        cycle.forEach((index, position) => (facelets[index] = colors[(position + 1) % cycle.length]));
        return facelets.join('');
    }

    it('gets stuck on a missing white corner or a flipped yellow edge', async () => {
        const solve = await solverWithoutCheck();
        // The white-red-blue corner (U7 F1 L3) replaced by a second white-red-green one
        const duplicated = [...SOLVED];
        [duplicated[6], duplicated[18], duplicated[38]] = ['U', 'R', 'F'];
        expect(() => solve(duplicated.join(''))).toThrow('got stuck');
        expect(() => solve(withSwapped([1, 46]))).toThrow('got stuck'); // The red-yellow edge (U2 B2)
    });

    it('never gives a wrong answer for a twisted white corner or a flipped middle edge either', async () => {
        const solve = await solverWithoutCheck();
        expect(() => solve(withSwapped([8, 9, 20]))).toThrow(); // A twist moves on to the last layer
        expect(() => solve(withSwapped([5, 10]))).toThrow();
    });

    it('notices its own wrong answer on a twisted yellow corner', async () => {
        const solve = await solverWithoutCheck();
        expect(() => solve(withSwapped([0, 36, 47]))).toThrow('made a mistake');
    });
});
