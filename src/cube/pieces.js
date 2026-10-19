// Which of the 54 stickers belong to the same piece, using Kociemba's standard tables.
// Stickers are written 1-based per face, U1..U9, R1..R9, F, D, L, B, in the layout CubeState uses.
//
// Each corner lists its stickers clockwise, starting with the one on the U or D face.
// Each edge lists its U or D sticker first, or for the four middle-layer edges, its F or B sticker.
// The solvability check relies on these orders to work out how pieces are twisted or flipped.

const CORNERS = ['U9 R1 F3', 'U7 F1 L3', 'U1 L1 B3', 'U3 B1 R3', 'D3 F9 R7', 'D1 L9 F7', 'D7 B9 L7', 'D9 R9 B7'];
const EDGES = [
    'U6 R2', 'U8 F2', 'U4 L2', 'U2 B2', 'D6 R8', 'D2 F8',
    'D4 L8', 'D8 B8', 'F6 R4', 'F4 L6', 'B6 L4', 'B4 R6'
];

function toIndex(name) {
    return 'URFDLB'.indexOf(name[0]) * 9 + Number(name[1]) - 1;
}

// The sticker indices of each piece, e.g. CORNER_FACELETS[0] is [8, 9, 20]
export const CORNER_FACELETS = CORNERS.map(piece => piece.split(' ').map(toIndex));
export const EDGE_FACELETS = EDGES.map(piece => piece.split(' ').map(toIndex));

// The colors (face letters) each piece has on a solved cube, in the same sticker order, e.g. ['U', 'R', 'F']
export const CORNER_COLORS = CORNERS.map(piece => piece.split(' ').map(name => name[0]));
export const EDGE_COLORS = EDGES.map(piece => piece.split(' ').map(name => name[0]));
