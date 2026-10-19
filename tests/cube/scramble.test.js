import { describe, it, expect } from 'vitest';
import { generateScramble } from '../../src/cube/scramble.js';
import { parseMoves } from '../../src/cube/notation.js';

const AXIS = { U: 'y', D: 'y', F: 'z', B: 'z', R: 'x', L: 'x' };

// A small seeded random generator so the scrambles are the same on every run
function seededRandom(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

describe('generateScramble', () => {
    // Many scrambles, so the rules are checked across lots of random choices
    const scrambles = Array.from({ length: 200 }, (_, seed) => parseMoves(generateScramble(25, seededRandom(seed))));

    it('has 25 valid moves by default', () => {
        for (const moves of scrambles) {
            expect(moves).toHaveLength(25);
        }
    });

    it('can have any length', () => {
        expect(parseMoves(generateScramble(5, seededRandom(1)))).toHaveLength(5);
    });

    it('never turns the same face twice in a row', () => {
        for (const moves of scrambles) {
            for (let i = 1; i < moves.length; i++) {
                expect(moves[i].face).not.toBe(moves[i - 1].face);
            }
        }
    });

    it('never makes three moves on the same axis in a row, like R L R', () => {
        for (const moves of scrambles) {
            for (let i = 2; i < moves.length; i++) {
                const axes = new Set([moves[i - 2], moves[i - 1], moves[i]].map(move => AXIS[move.face]));
                expect(axes.size).toBeGreaterThan(1);
            }
        }
    });

    it('uses every face and every kind of turn', () => {
        const all = scrambles.flat();
        expect(new Set(all.map(move => move.face)).size).toBe(6);
        expect(new Set(all.map(move => move.turns))).toEqual(new Set([1, -1, 2]));
    });

    it('gives the same scramble for the same random sequence', () => {
        expect(generateScramble(25, seededRandom(42))).toBe(generateScramble(25, seededRandom(42)));
    });
});
