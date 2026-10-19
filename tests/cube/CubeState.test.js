import { describe, it, expect } from 'vitest';
import CubeState, { SOLVED } from '../../src/cube/CubeState.js';
import { parseMoves } from '../../src/cube/notation.js';

const FACE_LETTERS = ['U', 'D', 'F', 'B', 'R', 'L'];

function stateAfter(notation) {
    return new CubeState().applyMoves(parseMoves(notation));
}

describe('CubeState', () => {
    it('starts solved', () => {
        const state = new CubeState();
        expect(state.isSolved()).toBe(true);
        expect(state.toString()).toBe(SOLVED);
    });

    it('matches the standard facelet string after R', () => {
        // The well-known result of R on a solved cube, in URFDLB facelet order
        expect(stateAfter('R').toString()).toBe(
            'UUFUUFUUF' + 'RRRRRRRRR' + 'FFDFFDFFD' + 'DDBDDBDDB' + 'LLLLLLLLL' + 'UBBUBBUBB'
        );
    });

    it('matches the standard facelet string after F', () => {
        // Unlike R, this checks the sticker order within the R and L faces
        expect(stateAfter('F').toString()).toBe(
            'UUUUUULLL' + 'URRURRURR' + 'FFFFFFFFF' + 'RRRDDDDDD' + 'LLDLLDLLD' + 'BBBBBBBBB'
        );
    });

    for (const face of FACE_LETTERS) {
        it(`moves exactly 20 stickers with ${face}`, () => {
            // Give every sticker its own label so each one can be tracked
            const labels = Array.from({ length: 54 }, (_, index) => index);
            const state = new CubeState(labels).applyMoves(parseMoves(face));
            const moved = state.facelets.filter((label, index) => label !== index);
            // 8 on the face itself (the center stays put) plus 3 on each of the 4 neighboring faces
            expect(moved).toHaveLength(20);
        });

        it(`returns to solved after four ${face} turns, after ${face} ${face}', and after ${face}2 ${face}2`, () => {
            expect(stateAfter(`${face} ${face} ${face} ${face}`).isSolved()).toBe(true);
            expect(stateAfter(`${face} ${face}'`).isSolved()).toBe(true);
            expect(stateAfter(`${face}2 ${face}2`).isSolved()).toBe(true);
            expect(stateAfter(face).isSolved()).toBe(false);
        });

        it(`treats ${face}2 as two ${face} turns and ${face}' as three`, () => {
            expect(stateAfter(`${face}2`).toString()).toBe(stateAfter(`${face} ${face}`).toString());
            expect(stateAfter(`${face}'`).toString()).toBe(stateAfter(`${face} ${face} ${face}`).toString());
        });
    }

    it("is solved after R U R' U' six times", () => {
        expect(stateAfter("R U R' U' ".repeat(6)).isSolved()).toBe(true);
    });

    it('needs exactly 105 repeats of R U to get back to solved', () => {
        const state = new CubeState();
        const rU = parseMoves('R U');
        for (let repeat = 1; repeat < 105; repeat++) {
            state.applyMoves(rU);
            expect(state.isSolved()).toBe(false);
        }
        state.applyMoves(rU);
        expect(state.isSolved()).toBe(true);
    });

    it('keeps 9 stickers of each color through a scramble', () => {
        const state = stateAfter("R U2 F' L D2 B R' U F2 D' L2 B'");
        for (const face of FACE_LETTERS) {
            expect(state.facelets.filter(sticker => sticker === face)).toHaveLength(9);
        }
    });

    it('clones independently', () => {
        const original = stateAfter('R');
        const copy = original.clone().applyMoves(parseMoves("R'"));
        expect(copy.isSolved()).toBe(true);
        expect(original.isSolved()).toBe(false);
    });
});
