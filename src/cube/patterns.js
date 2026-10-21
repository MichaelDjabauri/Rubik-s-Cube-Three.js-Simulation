import { parseMoves } from './notation.js';

// Famous patterns ("pretty patterns"), each made from a solved cube with the 18 face moves.
// The tests check that every one of them really makes its pattern.
//   id     a short name for saved cubes and links, which must never change
//   name   shown in the gallery and on the info line, e.g. "Pattern: Checkerboard"
//   about     one line on what the pattern looks like
//   notation  the moves that make it, e.g. "R2 L2 U2 D2 F2 B2"
//   moves     the same moves, parsed (see notation.js)
export const PATTERNS = [
    {
        id: 'checkerboard',
        name: 'Checkerboard',
        about: 'Every face a checkerboard of two opposite colors.',
        notation: 'R2 L2 U2 D2 F2 B2'
    },
    {
        id: 'six-spots',
        name: 'Six spots',
        about: 'A spot of another color in the middle of each face.',
        notation: "U D' R L' F B' U D'"
    },
    {
        id: 'python',
        name: 'Python',
        about: 'A snake that winds its way around the whole cube.',
        notation: "F2 R' B' U R' L F' L F' B D' R B L2"
    },
    {
        id: 'cube-in-a-cube',
        name: 'Cube in a cube',
        about: 'A small cube seems to sit in the corner of the big one.',
        notation: "F L F U' R U F2 L2 U' L' B D' B' L2 U"
    },
    {
        id: 'crosses',
        name: 'Crosses',
        about: 'A cross on every face, with corners of another color.',
        notation: "R2 L' D F2 R' D' R' L U' D R D B2 R' U D2"
    },
    {
        id: 'superflip',
        name: 'Superflip',
        about: 'Every edge flipped in place. It takes 20 moves, the most any position needs.',
        notation: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2"
    }
].map(pattern => ({ ...pattern, moves: parseMoves(pattern.notation) }));

// The pattern with this id, or null if there is none (e.g. in a damaged link)
export function findPattern(id) {
    return PATTERNS.find(pattern => pattern.id === id) ?? null;
}
