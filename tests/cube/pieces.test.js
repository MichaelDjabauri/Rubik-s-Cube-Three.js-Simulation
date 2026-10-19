import { describe, it, expect } from 'vitest';
import { CORNER_FACELETS, EDGE_FACELETS, CORNER_COLORS, EDGE_COLORS } from '../../src/cube/pieces.js';
import { faceletLocation, SOLVED } from '../../src/cube/CubeState.js';

describe('pieces', () => {
    it("matches CubeState's layout: each piece's stickers sit on one cubelet", () => {
        // This pins CubeState's sticker layout to Kociemba's standard tables, which solvers rely on
        for (const indices of [...CORNER_FACELETS, ...EDGE_FACELETS]) {
            const positions = indices.map(index => faceletLocation(index).position.join(','));
            expect(new Set(positions).size, indices.join(' ')).toBe(1);
        }
    });

    it('covers every non-center sticker exactly once', () => {
        const all = [...CORNER_FACELETS, ...EDGE_FACELETS].flat().sort((a, b) => a - b);
        const nonCenters = Array.from({ length: 54 }, (_, index) => index).filter(index => index % 9 !== 4);
        expect(all).toEqual(nonCenters);
    });

    it('lists the solved colors of each piece', () => {
        CORNER_FACELETS.forEach((indices, piece) => {
            expect(indices.map(index => SOLVED[index])).toEqual(CORNER_COLORS[piece]);
        });
        EDGE_FACELETS.forEach((indices, piece) => {
            expect(indices.map(index => SOLVED[index])).toEqual(EDGE_COLORS[piece]);
        });
    });

    it('lists each corner clockwise, as seen from outside the cube', () => {
        for (const indices of CORNER_FACELETS) {
            // The three outward directions in this order must form a right-handed (clockwise from outside) set
            const [a, b, c] = indices.map(index => faceletLocation(index).normal);
            const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
            const handedness = cross[0] * c[0] + cross[1] * c[1] + cross[2] * c[2];
            expect(handedness, indices.join(' ')).toBe(-1);
        }
    });
});
