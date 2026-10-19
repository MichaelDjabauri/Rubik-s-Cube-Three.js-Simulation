// The logical state of the cube: which color is on each of its 54 stickers ("facelets").
// It has no 3D code and is the source of truth; the 3D model only animates to match it.
//
// Each sticker holds the notation letter of the face it belongs to when solved, so the
// solved cube reads UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB.
// This is the standard facelet format that Kociemba-style solvers expect.
//
// Layout: faces in the order U R F D L B, 9 stickers each, numbered row by row
// as seen looking straight at that face:
//
//   0 1 2
//   3 4 5
//   6 7 8

// Each face's outward direction, and which way "right" and "down" point when you look at it.
// U is viewed with F at the bottom, D with F at the top, and the four sides with U on top.
// These must match the normals in faces.js; the tests check that they do.
const FACE_FRAMES = {
    U: { normal: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
    R: { normal: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
    F: { normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
    D: { normal: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
    L: { normal: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] },
    B: { normal: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] }
};

const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

export const SOLVED = FACE_ORDER.map(face => face.repeat(9)).join('');

// The index of the sticker on the cubelet at `position` that points in direction `normal`.
// Both are [x, y, z] arrays with integer coordinates.
export function faceletIndex(position, normal) {
    const faceIndex = FACE_ORDER.findIndex(face => equals(FACE_FRAMES[face].normal, normal));
    const { right, down } = FACE_FRAMES[FACE_ORDER[faceIndex]];
    const column = dot(position, right) + 1;
    const row = dot(position, down) + 1;
    return faceIndex * 9 + row * 3 + column;
}

// The cubelet position and outward direction of the sticker at `index`
export function faceletLocation(index) {
    const { normal, right, down } = FACE_FRAMES[FACE_ORDER[Math.floor(index / 9)]];
    const row = Math.floor((index % 9) / 3);
    const column = index % 3;
    const position = normal.map((n, axis) => n + (column - 1) * right[axis] + (row - 1) * down[axis]);
    return { position, normal };
}

// For a clockwise quarter turn of `face`: where the sticker at each index ends up.
// Worked out by rotating every sticker on that layer in 3D, so there's no hand-written table to get wrong.
function quarterTurnDestinations(face) {
    const axis = FACE_FRAMES[face].normal;

    return Array.from({ length: 54 }, (_, index) => {
        const { position, normal } = faceletLocation(index);
        if (dot(position, axis) !== 1) {
            return index; // Not on the turning layer, so it stays put
        }
        return faceletIndex(rotateClockwise(position, axis), rotateClockwise(normal, axis));
    });
}

const QUARTER_TURNS = Object.fromEntries(FACE_ORDER.map(face => [face, quarterTurnDestinations(face)]));

class CubeState {
    // `facelets` defaults to the solved cube. Any 54 values work, which the tests use to track individual stickers.
    constructor(facelets = SOLVED) {
        this.facelets = [...facelets];
    }

    // move: a parsed move like { face: 'R', turns: 1 } (see notation.js)
    applyMove({ face, turns }) {
        const destinations = QUARTER_TURNS[face];
        // A prime move is three clockwise quarter turns, a half turn is two
        const quarterTurns = (turns + 4) % 4;

        for (let i = 0; i < quarterTurns; i++) {
            const next = new Array(54);
            this.facelets.forEach((sticker, index) => {
                next[destinations[index]] = sticker;
            });
            this.facelets = next;
        }

        return this;
    }

    applyMoves(moves) {
        moves.forEach(move => this.applyMove(move));
        return this;
    }

    // Solved when every face shows a single color
    isSolved() {
        return FACE_ORDER.every((_, faceIndex) => {
            const face = this.facelets.slice(faceIndex * 9, faceIndex * 9 + 9);
            return face.every(sticker => sticker === face[4]);
        });
    }

    clone() {
        return new CubeState(this.facelets);
    }

    toString() {
        return this.facelets.join('');
    }
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function equals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

// Rotates vector v by a clockwise quarter turn, as seen looking at the axis from outside the cube.
// That's -90° around the axis, which for a unit axis simplifies to: v' = axis * (axis · v) - axis × v
function rotateClockwise(v, axis) {
    const cross = [
        axis[1] * v[2] - axis[2] * v[1],
        axis[2] * v[0] - axis[0] * v[2],
        axis[0] * v[1] - axis[1] * v[0]
    ];
    const along = dot(axis, v);
    return [0, 1, 2].map(i => axis[i] * along - cross[i]);
}

export default CubeState;
