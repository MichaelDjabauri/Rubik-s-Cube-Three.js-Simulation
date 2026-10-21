import { parseMove, formatMove, formatMoves } from './notation.js';
import { validateFacelets } from './validate.js';
import { STAGE_NAMES } from './solver.js';
import { findPattern } from './patterns.js';

// Writes a whole cube down as a short line of text, and reads it back. The same text is saved in the
// browser (so a reload never loses a cube) and put in shared links after the # (so a friend opens the same cube).
//
// A cube is described by a snapshot (see Cube.snapshot):
//   start           the 54 stickers of a copied cube in CubeState's layout, or null if it started solved
//   history         the moves made since the start, as parsed moves
//   redo            undone moves that can be redone, most recently undone last
//   scramble        the latest scramble's notation, or null
//   pattern         the id of the pattern played from solved (see patterns.js), or null
//   solveMoveCount  the number of moves in the solve in progress, or null if there is none
// and, in shared links only:
//   solution        a solution to show, as solveCube returns it ({ stages, moves }), or null
//
// The text looks like a web address's query, and leaves out empty parts, e.g.
//   v=1&moves=RU2F'&scramble=RU2F'
// A solution is written as all its moves plus the number of moves in each stage: solution=…&stages=3.10.0.…
// Moves are written without spaces, since every move starts with its face letter.
// A pattern this version doesn't know is left out, since it's only a name for the moves.

const VERSION = '1';
const FACELETS = /^[URFDLB]{54}$/;
const MOVES = /^([URFDLB]['2]?)*$/;
const COUNT = /^\d{1,6}$/;
const STAGE_COUNTS = new RegExp(`^\\d{1,4}(\\.\\d{1,4}){${STAGE_NAMES.length - 1}}$`);

export function encodeCube({
    start, history, redo = [], scramble = null, pattern = null, solveMoveCount = null, solution = null
}) {
    const parts = new URLSearchParams({ v: VERSION });
    if (start !== null) {
        parts.set('start', start);
    }
    if (history.length > 0) {
        parts.set('moves', compactMoves(history));
    }
    if (redo.length > 0) {
        parts.set('redo', compactMoves(redo));
    }
    if (scramble !== null) {
        parts.set('scramble', scramble.replaceAll(' ', ''));
    }
    if (pattern !== null) {
        parts.set('pattern', pattern);
    }
    if (solveMoveCount !== null) {
        parts.set('solve', String(solveMoveCount));
    }
    if (solution !== null) {
        parts.set('solution', compactMoves(solution.moves));
        parts.set('stages', solution.stages.map(stage => stage.moves.length).join('.'));
    }
    return parts.toString();
}

// Reads a cube written by encodeCube. Returns its snapshot, or null if the text isn't a cube or is damaged.
// A copied cube must be a cube that could really exist, so a mistyped link can't load an impossible one.
export function decodeCube(text) {
    const parts = new URLSearchParams(text);
    if (parts.get('v') !== VERSION) {
        return null;
    }

    const start = parts.get('start');
    const moves = parts.get('moves') ?? '';
    const redo = parts.get('redo') ?? '';
    const scramble = parts.get('scramble');
    const solve = parts.get('solve');
    const solution = decodeSolution(parts.get('solution'), parts.get('stages'));

    const isValid = (start === null || (FACELETS.test(start) && validateFacelets([...start]).valid))
        && MOVES.test(moves)
        && MOVES.test(redo)
        && (scramble === null || (scramble !== '' && MOVES.test(scramble)))
        && (solve === null || COUNT.test(solve))
        && solution !== undefined;
    if (!isValid) {
        return null;
    }

    return {
        start,
        history: expandMoves(moves),
        redo: expandMoves(redo),
        scramble: scramble === null ? null : formatMoves(expandMoves(scramble)),
        pattern: findPattern(parts.get('pattern'))?.id ?? null,
        solveMoveCount: solve === null ? null : Number(solve),
        solution
    };
}

// The solution, null if there is none, or undefined if it's damaged.
// Whether it actually solves the cube is checked when it's opened (see share.js).
function decodeSolution(moves, counts) {
    if (moves === null && counts === null) {
        return null;
    }
    if (moves === null || counts === null || !MOVES.test(moves) || !STAGE_COUNTS.test(counts)) {
        return undefined;
    }

    const all = expandMoves(moves);
    const lengths = counts.split('.').map(Number);
    if (lengths.reduce((sum, length) => sum + length, 0) !== all.length) {
        return undefined;
    }

    let start = 0;
    const stages = lengths.map((length, index) => {
        const stage = { name: STAGE_NAMES[index], moves: all.slice(start, start + length) };
        start += length;
        return stage;
    });
    return { stages, moves: all };
}

function compactMoves(moves) {
    return moves.map(formatMove).join('');
}

// "RU2F'" becomes [R, U2, F']
function expandMoves(text) {
    return (text.match(/[URFDLB]['2]?/g) ?? []).map(parseMove);
}
