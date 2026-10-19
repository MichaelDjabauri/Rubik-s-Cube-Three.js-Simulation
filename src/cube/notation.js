// Standard Rubik's Cube notation. Faces are named by position, not color:
// U (up), D (down), F (front), B (back), R (right) and L (left).
// A letter alone is a clockwise quarter turn as seen looking straight at that face,
// a ' (prime) makes it counterclockwise, and a 2 makes it a half turn.
// Example: "R U R' U2"
//
// A parsed move is an object like { face: 'R', turns: 1 }, where turns is 1, -1 (prime) or 2.

const TURNS_BY_SUFFIX = { '': 1, "'": -1, '2': 2 };
const SUFFIX_BY_TURNS = { 1: '', '-1': "'", 2: '2' };

export function parseMove(text) {
    // Also accept the curly apostrophe (’) that often appears in algorithms copied from websites
    const match = /^([UDFBRL])('|’|2)?$/.exec(text);
    if (!match) {
        throw new Error(`Invalid move: "${text}". Expected a face letter (U D F B R L), optionally followed by ' or 2.`);
    }

    const suffix = (match[2] ?? '').replace('’', "'");
    return { face: match[1], turns: TURNS_BY_SUFFIX[suffix] };
}

export function parseMoves(text) {
    return text.trim().split(/\s+/).filter(Boolean).map(parseMove);
}

export function formatMove({ face, turns }) {
    return face + SUFFIX_BY_TURNS[turns];
}

export function formatMoves(moves) {
    return moves.map(formatMove).join(' ');
}

// The move that undoes the given move. A half turn undoes itself.
export function invertMove({ face, turns }) {
    return { face, turns: turns === 2 ? 2 : -turns };
}

// The sequence that undoes the given sequence: the inverse moves, in reverse order
export function invertMoves(moves) {
    return [...moves].reverse().map(invertMove);
}
