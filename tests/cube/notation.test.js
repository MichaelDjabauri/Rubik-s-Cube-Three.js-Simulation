import { describe, it, expect } from 'vitest';
import { parseMove, parseMoves, formatMoves, invertMoves } from '../../src/cube/notation.js';

describe('notation', () => {
    it('parses a clockwise, a prime and a half turn', () => {
        expect(parseMove('R')).toEqual({ face: 'R', turns: 1 });
        expect(parseMove("U'")).toEqual({ face: 'U', turns: -1 });
        expect(parseMove('F2')).toEqual({ face: 'F', turns: 2 });
    });

    it('accepts the curly apostrophe from copied algorithms', () => {
        expect(parseMove('L’')).toEqual({ face: 'L', turns: -1 });
    });

    it('parses a sequence, ignoring extra spaces', () => {
        expect(parseMoves("  R U  R' U2 ")).toEqual([
            { face: 'R', turns: 1 },
            { face: 'U', turns: 1 },
            { face: 'R', turns: -1 },
            { face: 'U', turns: 2 }
        ]);
        expect(parseMoves('')).toEqual([]);
    });

    it('rejects anything that is not a move', () => {
        for (const bad of ['X', 'R3', 'r', "R2'", 'RU', 'M']) {
            expect(() => parseMove(bad), bad).toThrow(/Invalid move/);
        }
    });

    it('formats moves back into the same text', () => {
        const text = "R U R' U' F2 B L' D";
        expect(formatMoves(parseMoves(text))).toBe(text);
    });

    it('inverts a sequence by reversing it and inverting each move', () => {
        expect(formatMoves(invertMoves(parseMoves("R U2 F'")))).toBe("F U2 R'");
    });
});
