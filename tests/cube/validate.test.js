import { describe, it, expect } from 'vitest';
import { validateFacelets } from '../../src/cube/validate.js';
import CubeState, { SOLVED } from '../../src/cube/CubeState.js';
import { CORNER_FACELETS, EDGE_FACELETS, CORNER_COLORS } from '../../src/cube/pieces.js';
import { generateScramble } from '../../src/cube/scramble.js';
import { parseMoves } from '../../src/cube/notation.js';

// A small seeded random generator so the scrambles are the same on every run
function seededRandom(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

function scrambled(seed) {
    return new CubeState().applyMoves(parseMoves(generateScramble(25, seededRandom(seed)))).facelets;
}

// Moves the stickers at `from` to the positions at `to`, like taking pieces out and putting them back elsewhere
function moveStickers(facelets, from, to) {
    const result = [...facelets];
    from.forEach((index, i) => {
        result[to[i]] = facelets[index];
    });
    return result;
}

// Paints the corner at `position` with the colors of corner `piece`, untwisted
function paintCorner(facelets, position, piece) {
    const result = [...facelets];
    CORNER_FACELETS[position].forEach((index, i) => {
        result[index] = CORNER_COLORS[piece][i];
    });
    return result;
}

function problemTypes(facelets) {
    return validateFacelets(facelets).problems.map(problem => problem.type);
}

describe('validateFacelets', () => {
    it('accepts the solved cube', () => {
        expect(validateFacelets([...SOLVED])).toEqual({ valid: true, problems: [] });
    });

    it('accepts every scrambled cube, since all of them are real', () => {
        for (let seed = 0; seed < 50; seed++) {
            const { valid, problems } = validateFacelets(scrambled(seed));
            expect(valid, problems.map(problem => problem.message).join(' ')).toBe(true);
        }
    });

    it('says how many stickers are left while painting', () => {
        const draft = [...SOLVED];
        draft[0] = null;
        draft[10] = null;
        draft[30] = null;
        const { valid, problems } = validateFacelets(draft);
        expect(valid).toBe(false);
        expect(problems).toEqual([{ type: 'incomplete', message: '3 stickers left to paint.', facelets: [] }]);
    });

    it('warns about too many stickers of a color while still painting', () => {
        const draft = [...SOLVED];
        draft[0] = null;
        draft[1] = 'F';
        expect(problemTypes(draft)).toEqual(['incomplete', 'count']);
        expect(validateFacelets(draft).problems[1].message).toBe('Too many white stickers: 10 instead of 9.');
    });

    it('reports wrong counts once every sticker is painted', () => {
        const cube = [...SOLVED];
        cube[0] = 'F';
        const { problems } = validateFacelets(cube);
        expect(problems.map(problem => problem.type)).toEqual(['count']);
        expect(problems[0].message).toBe('Every color needs exactly 9 stickers, but there are 8 red, 10 white.');
    });

    it('reports centers in the wrong place', () => {
        const cube = moveStickers([...SOLVED], [4, 22], [22, 4]);
        expect(problemTypes(cube)).toEqual(['centers']);
    });

    it('reports a piece with two opposite colors and highlights it', () => {
        // Swap the green sticker on the top-right-front corner with an orange one from the bottom,
        // so the counts stay right but the corner gets both red and orange
        const cube = moveStickers([...SOLVED], [9, 27], [27, 9]);
        const problem = validateFacelets(cube).problems.find(candidate => candidate.type === 'impossiblePiece');
        expect(problem.message).toContain('opposite colors');
        expect(problem.message).toContain('red and orange');
        expect(problem.facelets).toEqual(CORNER_FACELETS[0]);
    });

    it('reports a mirror-image corner, whose colors run the wrong way round', () => {
        // Swap two stickers within one corner: same three colors, but mirrored
        const [a, b] = CORNER_FACELETS[0];
        const cube = moveStickers([...SOLVED], [a, b], [b, a]);
        const { problems } = validateFacelets(cube);
        expect(problems.map(problem => problem.type)).toEqual(['impossiblePiece']);
        expect(problems[0].message).toBe('The top-right-front corner has green, red, white in mirrored order, which doesn\'t exist on a real cube. Two of its stickers are probably swapped.');
        expect(problems[0].facelets).toEqual(CORNER_FACELETS[0]);
    });

    it('reports pieces that appear twice, and the ones that are missing', () => {
        // Paint the bottom-right-back corner as a second red-green-white corner, and, to keep the
        // color counts right, the top-front-left corner as a second orange-yellow-blue one
        const cube = paintCorner(paintCorner([...SOLVED], 7, 0), 1, 6);
        const { problems } = validateFacelets(cube);

        expect(problems.map(problem => problem.type)).toEqual(['duplicatePiece']);
        expect(problems[0].message).toBe(
            'There are 2 red-green-white corners and 2 orange-yellow-blue corners, and no red-white-blue corner and no orange-green-yellow corner.'
        );
        expect(problems[0].facelets).toEqual(expect.arrayContaining([...CORNER_FACELETS[0], ...CORNER_FACELETS[7]]));
    });

    it('reports a single twisted corner', () => {
        const [a, b, c] = CORNER_FACELETS[2];
        const cube = moveStickers(scrambled(1), [a, b, c], [b, c, a]);
        expect(problemTypes(cube)).toEqual(['twist']);
    });

    it('accepts one corner twisted each way, since together they cancel out', () => {
        const [a, b, c] = CORNER_FACELETS[2];
        const [d, e, f] = CORNER_FACELETS[5];
        let cube = moveStickers(scrambled(1), [a, b, c], [b, c, a]);
        cube = moveStickers(cube, [d, e, f], [f, d, e]);
        expect(validateFacelets(cube).valid).toBe(true);
    });

    it('reports a single flipped edge', () => {
        const [a, b] = EDGE_FACELETS[4];
        const cube = moveStickers(scrambled(2), [a, b], [b, a]);
        expect(problemTypes(cube)).toEqual(['flip']);
    });

    it('reports two swapped edges', () => {
        const cube = moveStickers(scrambled(3), [...EDGE_FACELETS[0], ...EDGE_FACELETS[7]], [...EDGE_FACELETS[7], ...EDGE_FACELETS[0]]);
        expect(problemTypes(cube)).toEqual(['parity']);
    });

    it('reports two swapped corners', () => {
        const cube = moveStickers(scrambled(4), [...CORNER_FACELETS[1], ...CORNER_FACELETS[6]], [...CORNER_FACELETS[6], ...CORNER_FACELETS[1]]);
        expect(problemTypes(cube)).toEqual(['parity']);
    });

    it('accepts two swapped edges plus two swapped corners, since that is a real position', () => {
        let cube = moveStickers([...SOLVED], [...EDGE_FACELETS[0], ...EDGE_FACELETS[1]], [...EDGE_FACELETS[1], ...EDGE_FACELETS[0]]);
        cube = moveStickers(cube, [...CORNER_FACELETS[0], ...CORNER_FACELETS[1]], [...CORNER_FACELETS[1], ...CORNER_FACELETS[0]]);
        expect(validateFacelets(cube).valid).toBe(true);
    });

    it('reports an edge with two opposite colors', () => {
        // Swap the red sticker of the top-right edge with a blue one, so the edge shows blue and green
        const [top, right] = EDGE_FACELETS[0];
        const blueSticker = EDGE_FACELETS[2][1];
        const cube = moveStickers([...SOLVED], [top, blueSticker], [blueSticker, top]);
        const problem = validateFacelets(cube).problems.find(candidate => candidate.facelets.includes(right));
        expect(problem.type).toBe('impossiblePiece');
        expect(problem.message).toBe('The top-right edge has blue and green on it, which are opposite colors and never share a piece.');
        expect(problem.facelets).toEqual(EDGE_FACELETS[0]);
    });

    it('reports a piece with the same color twice', () => {
        // Give the top-front edge two white stickers, keeping the counts right by moving its red sticker elsewhere
        const [top, front] = EDGE_FACELETS[1];
        const whiteElsewhere = CORNER_FACELETS[4][1];
        const cube = moveStickers([...SOLVED], [top, whiteElsewhere], [whiteElsewhere, top]);
        const problem = validateFacelets(cube).problems.find(candidate => candidate.facelets.includes(front));
        expect(problem.message).toBe('The top-front edge has two white stickers, but no piece has the same color twice.');
    });

    it('reports impossible pieces before duplicates, since a misread piece can look like a missing one', () => {
        // Duplicated corners, plus two edges with impossible colors after swapping a red and a blue sticker
        let cube = paintCorner(paintCorner([...SOLVED], 7, 0), 1, 6);
        cube = moveStickers(cube, [EDGE_FACELETS[0][0], EDGE_FACELETS[2][1]], [EDGE_FACELETS[2][1], EDGE_FACELETS[0][0]]);
        expect(problemTypes(cube)).toEqual(['impossiblePiece', 'impossiblePiece']);
    });
});
