import { describe, it, expect } from 'vitest';
import { encodeCube, decodeCube } from '../../src/cube/cubeCode.js';
import CubeState, { SOLVED } from '../../src/cube/CubeState.js';
import { parseMoves } from '../../src/cube/notation.js';
import { STAGE_NAMES } from '../../src/cube/solver.js';

const A_REAL_CUBE = new CubeState().applyMoves(parseMoves("R U2 F' L D B2 R' U")).toString();

function snapshot(fields = {}) {
    return { start: null, history: [], redo: [], scramble: null, pattern: null, solveMoveCount: null, solution: null, ...fields };
}

describe('encodeCube and decodeCube', () => {
    it('write the solved cube as just a version number', () => {
        expect(encodeCube(snapshot())).toBe('v=1');
        expect(decodeCube('v=1')).toEqual(snapshot());
    });

    it('write moves without spaces, and read them back', () => {
        const cube = snapshot({ history: parseMoves("R U2 F'"), redo: parseMoves('D'), scramble: "R U2 F'", solveMoveCount: 3 });
        const text = encodeCube(cube);
        expect(text).toBe('v=1&moves=RU2F%27&redo=D&scramble=RU2F%27&solve=3');
        expect(decodeCube(text)).toEqual(cube);
    });

    it('keep a copied cube, even a solved one', () => {
        for (const start of [A_REAL_CUBE, SOLVED]) {
            const cube = snapshot({ start, history: parseMoves('L') });
            expect(decodeCube(encodeCube(cube))).toEqual(cube);
        }
    });

    it('can leave out the redo moves, scramble and solve count', () => {
        expect(encodeCube({ start: null, history: parseMoves('R') })).toBe('v=1&moves=R');
    });

    it('keep the pattern played, and leave out one this version does not know', () => {
        const cube = snapshot({ history: parseMoves('R2 L2 U2 D2 F2 B2'), pattern: 'checkerboard' });
        const text = encodeCube(cube);
        expect(text).toBe('v=1&moves=R2L2U2D2F2B2&pattern=checkerboard');
        expect(decodeCube(text)).toEqual(cube);
        expect(decodeCube('v=1&moves=R&pattern=nonsense')).toEqual(snapshot({ history: parseMoves('R') }));
    });

    it('accept a solve count of 0', () => {
        expect(decodeCube('v=1&moves=R&solve=0').solveMoveCount).toBe(0);
    });

    it('reject text that is not a cube, or is damaged', () => {
        const broken = [
            '',
            'hello',
            'v=2&moves=R',                  // A version this app doesn't know
            'v=1&moves=RX',                 // Not a move
            "v=1&moves=R''",
            'v=1&redo=3',
            'v=1&scramble=',                // An empty scramble
            'v=1&scramble=Q',
            'v=1&solve=-1',
            'v=1&solve=many',
            `v=1&start=${A_REAL_CUBE.slice(0, 50)}`, // Cut off
            `v=1&start=${'X'.repeat(54)}`
        ];
        for (const text of broken) {
            expect(decodeCube(text), text).toBeNull();
        }
    });

    it('reject a copied cube that could not really exist', () => {
        // Two stickers swapped on one corner: a twisted corner
        const twisted = [...SOLVED];
        [twisted[8], twisted[9]] = [twisted[9], twisted[8]];
        expect(decodeCube(`v=1&start=${twisted.join('')}`)).toBeNull();
    });

    it('ignore parts it does not know, e.g. added by a messaging app', () => {
        expect(decodeCube('v=1&moves=R&utm_source=chat')).toEqual(snapshot({ history: parseMoves('R') }));
    });
});

describe('a solution in the cube text', () => {
    const solution = {
        stages: STAGE_NAMES.map((name, index) => ({ name, moves: index === 0 ? parseMoves("R U'") : index === 3 ? parseMoves('F2') : [] })),
        moves: parseMoves("R U' F2")
    };

    it('is written as all its moves plus the number of moves per stage, and read back', () => {
        const text = encodeCube(snapshot({ solution }));
        expect(text).toBe('v=1&solution=RU%27F2&stages=2.0.0.1.0.0.0');
        expect(decodeCube(text)).toEqual(snapshot({ solution }));
    });

    it('is rejected when damaged', () => {
        const broken = [
            'v=1&solution=RU',                    // No stages
            'v=1&stages=2.0.0.0.0.0.0',           // No moves
            'v=1&solution=RX&stages=2.0.0.0.0.0.0',
            'v=1&solution=RU&stages=2.0.0',       // Too few stages
            'v=1&solution=RU&stages=3.0.0.0.0.0.0' // Counts don't add up
        ];
        for (const text of broken) {
            expect(decodeCube(text), text).toBeNull();
        }
    });
});
