import { FACES } from './faces.js';
import { CORNER_FACELETS, EDGE_FACELETS, CORNER_COLORS, EDGE_COLORS } from './pieces.js';

// Checks whether 54 stickers could be a real, solvable cube, and explains why not.
//
// facelets: 54 face letters in CubeState's layout, or null for a sticker that isn't painted yet.
// Returns { valid, problems }, where each problem is { type, message, facelets } and `facelets`
// lists the stickers worth highlighting (empty when no single piece is to blame).
//
// The checks, in order (later ones only run once the earlier ones pass):
//   centers          the 6 centers are in their fixed places
//   incomplete       every sticker is painted
//   count            exactly 9 stickers of each color
//   impossiblePiece  every corner and edge has a color combination a real cube has
//   duplicatePiece   no piece appears twice
//   twist, flip      corners aren't twisted and edges aren't flipped in place
//   parity           no two pieces are swapped
export function validateFacelets(facelets) {
    const centers = checkCenters(facelets);
    if (centers.length > 0) {
        return result(centers);
    }

    const counts = checkCounts(facelets);
    if (counts.length > 0) {
        return result(counts);
    }

    const corners = CORNER_FACELETS.map(indices => identifyCorner(indices.map(index => facelets[index])));
    const edges = EDGE_FACELETS.map(indices => identifyEdge(indices.map(index => facelets[index])));

    const impossible = checkImpossiblePieces(facelets, corners, edges);
    if (impossible.length > 0) {
        return result(impossible);
    }

    const duplicates = checkDuplicatePieces(corners, edges);
    if (duplicates.length > 0) {
        return result(duplicates);
    }

    return result(checkTwistFlipAndParity(corners, edges));
}

const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];
const OPPOSITE = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };
const POSITION_NAMES = { U: 'top', D: 'bottom', F: 'front', B: 'back', R: 'right', L: 'left' };

function result(problems) {
    return { valid: problems.length === 0, problems };
}

function checkCenters(facelets) {
    const wrong = FACE_ORDER.filter((face, faceIndex) => facelets[faceIndex * 9 + 4] !== face);
    if (wrong.length === 0) {
        return [];
    }
    return [{
        type: 'centers',
        message: 'The centers must be red on top, white in front, green on the right, blue on the left, orange on the bottom and yellow at the back.',
        facelets: wrong.map(face => FACE_ORDER.indexOf(face) * 9 + 4)
    }];
}

function checkCounts(facelets) {
    const count = face => facelets.filter(sticker => sticker === face).length;
    const missing = facelets.filter(sticker => sticker === null || sticker === undefined).length;
    const problems = [];

    if (missing > 0) {
        problems.push({
            type: 'incomplete',
            message: `${missing} ${missing === 1 ? 'sticker' : 'stickers'} left to paint.`,
            facelets: []
        });
        // Too many of a color is already certain to be wrong, so say so right away
        for (const face of FACE_ORDER.filter(face => count(face) > 9)) {
            problems.push({ type: 'count', message: `Too many ${colorName(face)} stickers: ${count(face)} instead of 9.`, facelets: [] });
        }
        return problems;
    }

    const wrong = FACE_ORDER.filter(face => count(face) !== 9);
    if (wrong.length > 0) {
        const details = wrong.map(face => `${count(face)} ${colorName(face)}`).join(', ');
        problems.push({ type: 'count', message: `Every color needs exactly 9 stickers, but there are ${details}.`, facelets: [] });
    }
    return problems;
}

// Which real corner these 3 colors are, and how it's twisted: 0 if its U or D color is on the
// U or D face, 1 or 2 if it's turned clockwise or counterclockwise. Null if no real corner matches.
function identifyCorner(colors) {
    const twist = colors.findIndex(color => color === 'U' || color === 'D');
    if (twist === -1) {
        return null;
    }
    // Reading the colors clockwise from the U or D color must match a real corner exactly.
    // That also rules out mirror images, whose colors run the other way round.
    const clockwise = [0, 1, 2].map(offset => colors[(twist + offset) % 3]);
    const piece = CORNER_COLORS.findIndex(real => real.every((color, i) => color === clockwise[i]));
    return piece === -1 ? null : { piece, twist };
}

// Which real edge these 2 colors are, and whether it's flipped. Null if no real edge matches.
function identifyEdge(colors) {
    for (let piece = 0; piece < EDGE_COLORS.length; piece++) {
        const [first, second] = EDGE_COLORS[piece];
        if (colors[0] === first && colors[1] === second) {
            return { piece, flip: 0 };
        }
        if (colors[0] === second && colors[1] === first) {
            return { piece, flip: 1 };
        }
    }
    return null;
}

function checkImpossiblePieces(facelets, corners, edges) {
    const problems = [];

    corners.forEach((corner, position) => {
        if (!corner) {
            const indices = CORNER_FACELETS[position];
            problems.push({
                type: 'impossiblePiece',
                message: `The ${locationName(indices)} corner ${whyImpossible(indices.map(index => facelets[index]))}`,
                facelets: indices
            });
        }
    });

    edges.forEach((edge, position) => {
        if (!edge) {
            const indices = EDGE_FACELETS[position];
            problems.push({
                type: 'impossiblePiece',
                message: `The ${locationName(indices)} edge ${whyImpossible(indices.map(index => facelets[index]))}`,
                facelets: indices
            });
        }
    });

    return problems;
}

function whyImpossible(colors) {
    const repeated = colors.find((color, i) => colors.indexOf(color) !== i);
    if (repeated) {
        return `has two ${colorName(repeated)} stickers, but no piece has the same color twice.`;
    }
    const opposite = colors.find(color => colors.includes(OPPOSITE[color]));
    if (opposite) {
        return `has ${colorName(opposite)} and ${colorName(OPPOSITE[opposite])} on it, which are opposite colors and never share a piece.`;
    }
    return `has ${colors.map(colorName).join(', ')} in mirrored order, which doesn't exist on a real cube. Two of its stickers are probably swapped.`;
}

function checkDuplicatePieces(corners, edges) {
    return [
        duplicateProblem('corner', corners, CORNER_COLORS, CORNER_FACELETS),
        duplicateProblem('edge', edges, EDGE_COLORS, EDGE_FACELETS)
    ].filter(problem => problem !== null);
}

// A problem if any corner (or edge) appears more than once, otherwise null.
// found: the piece identified at each position. pieceColors, positionFacelets: the tables from pieces.js.
function duplicateProblem(kind, found, pieceColors, positionFacelets) {
    // For each piece, the positions where it was found
    const positionsOf = pieceColors.map((_, piece) =>
        found.flatMap((match, position) => (match.piece === piece ? [position] : []))
    );
    const pieces = pieceColors.map((_, piece) => piece);
    const duplicated = pieces.filter(piece => positionsOf[piece].length > 1);
    if (duplicated.length === 0) {
        return null;
    }
    const missing = pieces.filter(piece => positionsOf[piece].length === 0);

    const name = piece => `${pieceName(pieceColors[piece])} ${kind}`;
    const tooMany = duplicated.map(piece => `${positionsOf[piece].length} ${name(piece)}s`).join(' and ');
    const none = missing.map(piece => `no ${name(piece)}`).join(' and ');

    return {
        type: 'duplicatePiece',
        message: `There are ${tooMany}, and ${none}.`,
        facelets: duplicated.flatMap(piece => positionsOf[piece].flatMap(position => positionFacelets[position]))
    };
}

function checkTwistFlipAndParity(corners, edges) {
    const problems = [];

    const totalTwist = corners.reduce((sum, corner) => sum + corner.twist, 0);
    if (totalTwist % 3 !== 0) {
        problems.push({
            type: 'twist',
            message: 'One corner is twisted. On a real cube this happens when a corner gets turned in place. Check that every corner\'s colors are painted in the right order.',
            facelets: []
        });
    }

    const totalFlip = edges.reduce((sum, edge) => sum + edge.flip, 0);
    if (totalFlip % 2 !== 0) {
        problems.push({
            type: 'flip',
            message: 'One edge is flipped. On a real cube this happens when an edge is popped out and put back the wrong way round. Check that every edge\'s two colors are painted the right way round.',
            facelets: []
        });
    }

    // Both arrangements must need an even number of swaps, or both an odd number
    if (parity(corners.map(corner => corner.piece)) !== parity(edges.map(edge => edge.piece))) {
        problems.push({
            type: 'parity',
            message: 'Two pieces are swapped. On a real cube this happens when it is put back together wrongly. Check for two corners or two edges whose stickers were painted the wrong way round.',
            facelets: []
        });
    }

    return problems;
}

// 0 if the arrangement can be sorted with an even number of swaps, 1 if it needs an odd number
function parity(arrangement) {
    let inversions = 0;
    for (let i = 0; i < arrangement.length; i++) {
        for (let j = i + 1; j < arrangement.length; j++) {
            if (arrangement[i] > arrangement[j]) {
                inversions++;
            }
        }
    }
    return inversions % 2;
}

function colorName(face) {
    return FACES.find(candidate => candidate.notation === face).color;
}

function pieceName(faces) {
    return faces.map(colorName).join('-');
}

// Where a piece sits, from the faces its stickers are on, e.g. "top-right-front"
function locationName(indices) {
    return indices.map(index => POSITION_NAMES[FACE_ORDER[Math.floor(index / 9)]]).join('-');
}
