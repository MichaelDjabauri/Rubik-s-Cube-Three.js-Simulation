import { describe, it, expect } from 'vitest';
import { PATTERNS, findPattern } from '../../src/cube/patterns.js';
import CubeState from '../../src/cube/CubeState.js';
import { EDGE_FACELETS, EDGE_COLORS, CORNER_FACELETS, CORNER_COLORS } from '../../src/cube/pieces.js';

const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];
const OPPOSITE = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };

// Places on a face, numbered row by row as in CubeState
const CORNERS = [0, 2, 6, 8];
const EDGES = [1, 3, 5, 7];
const CENTER = 4;

// The cube after the pattern's moves, as a list of faces, each { face, stickers: its 9 letters }
function facesOf(id) {
    const { facelets } = new CubeState().applyMoves(findPattern(id).moves);
    return FACE_ORDER.map((face, index) => ({ face, stickers: facelets.slice(index * 9, index * 9 + 9) }));
}

function colorsAt(stickers, places) {
    return new Set(places.map(place => stickers[place]));
}

// Whether the places form one connected group, moving between neighbors in a row or column
function isConnected(places) {
    const reached = [places[0]];
    for (const place of reached) { // Also visits the places added along the way
        for (const other of places) {
            if (!reached.includes(other) && areNeighbors(place, other)) {
                reached.push(other);
            }
        }
    }
    return reached.length === places.length;
}

function areNeighbors(a, b) {
    const sameRow = Math.floor(a / 3) === Math.floor(b / 3);
    return Math.abs(a - b) === 3 || (Math.abs(a - b) === 1 && sameRow);
}

describe('PATTERNS', () => {
    it('have unique ids and names, and no face turned twice in a row', () => {
        expect(new Set(PATTERNS.map(pattern => pattern.id)).size).toBe(PATTERNS.length);
        expect(new Set(PATTERNS.map(pattern => pattern.name)).size).toBe(PATTERNS.length);
        for (const { name, moves } of PATTERNS) {
            moves.slice(1).forEach((move, index) => expect(move.face, name).not.toBe(moves[index].face));
        }
    });

    it('checkerboard: the corners keep the face color, and the edges take the opposite color', () => {
        for (const { face, stickers } of facesOf('checkerboard')) {
            expect(colorsAt(stickers, [...CORNERS, CENTER])).toEqual(new Set([face]));
            expect(colorsAt(stickers, EDGES)).toEqual(new Set([OPPOSITE[face]]));
        }
    });

    it('six spots: one color around a center of another color', () => {
        for (const { face, stickers } of facesOf('six-spots')) {
            const around = colorsAt(stickers, [...CORNERS, ...EDGES]);
            expect(around.size).toBe(1);
            expect(around.has(face)).toBe(false);
        }
    });

    it('crosses: a cross of the face color, with all four corners in one other color', () => {
        for (const { face, stickers } of facesOf('crosses')) {
            expect(colorsAt(stickers, [...EDGES, CENTER])).toEqual(new Set([face]));
            const corners = colorsAt(stickers, CORNERS);
            expect(corners.size).toBe(1);
            expect(corners.has(face)).toBe(false);
        }
    });

    it('cube in a cube: a 2x2 block of one color in a corner of each face, and the rest in another color', () => {
        const blocks = [[0, 1, 3, 4], [1, 2, 4, 5], [3, 4, 6, 7], [4, 5, 7, 8]];
        for (const { face, stickers } of facesOf('cube-in-a-cube')) {
            const found = blocks.some(block => {
                const rest = [...Array(9).keys()].filter(place => !block.includes(place));
                const inside = colorsAt(stickers, block);
                const outside = colorsAt(stickers, rest);
                return inside.size === 1 && outside.size === 1 && [...inside][0] !== [...outside][0];
            });
            expect(found, face).toBe(true);
        }
    });

    it('python: two colors per face, with a line of three in the face color running through the center', () => {
        for (const { face, stickers } of facesOf('python')) {
            expect(new Set(stickers).size).toBe(2);
            const own = [...stickers.keys()].filter(place => stickers[place] === face);
            expect(own).toHaveLength(3);
            expect(own).toContain(CENTER);
            expect(isConnected(own), face).toBe(true);
        }
    });

    it('superflip: every corner solved, and every edge in its own place but flipped', () => {
        const { facelets } = new CubeState().applyMoves(findPattern('superflip').moves);
        CORNER_FACELETS.forEach((stickers, corner) => {
            expect(stickers.map(index => facelets[index])).toEqual(CORNER_COLORS[corner]);
        });
        EDGE_FACELETS.forEach((stickers, edge) => {
            expect(stickers.map(index => facelets[index])).toEqual([...EDGE_COLORS[edge]].reverse());
        });
    });

    it('can be looked up by id', () => {
        expect(findPattern('superflip').name).toBe('Superflip');
        expect(findPattern('nonsense')).toBeNull();
    });
});
