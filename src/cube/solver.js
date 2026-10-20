import CubeState, { SOLVED, faceletIndex, faceletLocation } from './CubeState.js';
import { CORNER_FACELETS, EDGE_FACELETS } from './pieces.js';
import { parseMoves } from './notation.js';
import { validateFacelets } from './validate.js';

// Solves any real cube with the classic beginner method, layer by layer, starting with the white cross.
//
// The beginner method is taught with white at the bottom and yellow on top. The app holds the cube
// with red on top and white in front, so the solver works on a turned copy: the whole cube tipped
// forward (a whole-cube turn called x'). There, white is down (D) and yellow is up (U), and every
// stage can be written the way tutorials write it. A whole-cube turn only renames the faces, so the
// moves found there are renamed back to the app's faces at the end.
//
// Each stage tries a small, fixed set of candidate sequences and keeps the shortest one that solves
// its pieces without breaking anything solved before, so there are no hand-written case tables to get wrong.

export const STAGE_NAMES = [
    'White cross',
    'White corners',
    'Middle layer',
    'Yellow cross',
    'Yellow edges',
    'Yellow corners in place',
    'Yellow corners turned'
];

// Where each of the app's faces ends up in the turned copy, and back
const TO_TURNED = { F: 'D', U: 'F', B: 'U', D: 'B', R: 'R', L: 'L' };
const FROM_TURNED = Object.fromEntries(Object.entries(TO_TURNED).map(([app, turned]) => [turned, app]));

// The pieces, as lists of sticker indices (see pieces.js), in the turned copy where white is down
const CROSS_EDGES = EDGE_FACELETS.slice(4, 8);   // DR, DF, DL, DB
const WHITE_CORNERS = CORNER_FACELETS.slice(4, 8); // DFR, DLF, DBL, DRB
const MIDDLE_EDGES = EDGE_FACELETS.slice(8, 12); // FR, FL, BL, BR
const YELLOW_EDGES = EDGE_FACELETS.slice(0, 4);
const YELLOW_CORNERS = CORNER_FACELETS.slice(0, 4);

const FIRST_LAYER = [...CROSS_EDGES, ...WHITE_CORNERS];
const FIRST_TWO_LAYERS = [...FIRST_LAYER, ...MIDDLE_EDGES];

// For a slot in the bottom or middle layer, the face it's seen from and the face to its right,
// when looking at it from the side with yellow on top
const WHITE_CORNER_SIDES = [['F', 'R'], ['L', 'F'], ['B', 'L'], ['R', 'B']];
const MIDDLE_EDGE_SIDES = [['F', 'R'], ['L', 'F'], ['B', 'L'], ['R', 'B']];
const SIDES = [['F', 'R', 'L'], ['R', 'B', 'F'], ['B', 'L', 'R'], ['L', 'F', 'B']]; // front, right, left

const U_TURNS = [[], parseMoves('U'), parseMoves('U2'), parseMoves("U'")];
// Stands for "no candidate works", longer than any real candidate so it's never picked as the easiest
const STUCK = { length: Infinity };

// Solves the cube given as 54 face letters in CubeState's layout.
// Returns { stages: [{ name, moves }], moves }, with moves as parsed moves for the app's faces.
// Throws if the stickers aren't a real cube.
export function solveCube(facelets) {
    if (!validateFacelets([...facelets]).valid) {
        throw new Error('This cube cannot be solved: its stickers are not a real cube.');
    }

    const cube = new CubeState(toTurnedFrame([...facelets]));
    const stageMoves = [
        solveCross(cube),
        solveWhiteCorners(cube),
        solveMiddleLayer(cube),
        solveYellowCross(cube),
        solveYellowEdges(cube),
        placeYellowCorners(cube),
        turnYellowCorners(cube)
    ];

    const stages = stageMoves.map((moves, index) => ({
        name: STAGE_NAMES[index],
        moves: simplify(moves).map(({ face, turns }) => ({ face: FROM_TURNED[face], turns }))
    }));
    const moves = stages.flatMap(stage => stage.moves);

    // Never show a wrong answer
    if (!new CubeState(facelets).applyMoves(moves).isSolved()) {
        throw new Error('The solver made a mistake. Please report this cube.');
    }
    return { stages, moves };
}

// The turned copy of the cube: every sticker moved by the whole-cube turn, and renamed to the face it now belongs to
function toTurnedFrame(facelets) {
    const turned = new Array(54);
    facelets.forEach((sticker, index) => {
        const { position, normal } = faceletLocation(index);
        turned[faceletIndex(tipForward(position), tipForward(normal))] = TO_TURNED[sticker];
    });
    return turned;
}

// The whole-cube turn x': a quarter turn around the x axis that moves the front down
function tipForward([x, y, z]) {
    return [x, -z, y];
}

// Stage 1: the white cross, as short as possible (at most 8 moves)
function solveCross(cube) {
    const table = crossDistances();
    const moves = [];
    let state = crossState(cube.facelets);

    while (table.distances[state] > 0) {
        const next = table.moves.find(move => table.distances[table.apply(state, move)] === table.distances[state] - 1);
        moves.push(next);
        state = table.apply(state, next);
    }
    return apply(cube, moves);
}

// Where the 4 white edges are, as one number: the position of each edge's white sticker, in the
// order of CROSS_EDGES. White is D in the turned copy.
function crossState(facelets) {
    const ids = edgeStickerIds();
    let state = 0;
    for (const [, sideSlot] of CROSS_EDGES) {
        const sideColor = SOLVED[sideSlot];
        const piece = EDGE_FACELETS.flatMap(([a, b]) => [[a, b], [b, a]])
            .find(([white, side]) => facelets[white] === 'D' && facelets[side] === sideColor);
        state = state * 24 + ids.get(piece[0]);
    }
    return state;
}

// The 24 edge stickers, numbered 0 to 23
let edgeIds = null;
function edgeStickerIds() {
    edgeIds ??= new Map(EDGE_FACELETS.flat().map((sticker, id) => [sticker, id]));
    return edgeIds;
}

// A table of how many moves each arrangement of the 4 white edges is from a finished cross,
// worked out once by searching outwards from the finished cross
let crossTable = null;
function crossDistances() {
    if (crossTable) {
        return crossTable;
    }

    const ids = edgeStickerIds();
    const stickers = [...ids.keys()];
    const moves = parseMoves("U U' U2 D D' D2 F F' F2 B B' B2 R R' R2 L L' L2");
    // For each move, where each edge sticker goes, by number
    const moved = moves.map(move => {
        const after = new CubeState(Array.from({ length: 54 }, (_, index) => index)).applyMove(move).facelets;
        const destination = new Array(54);
        after.forEach((from, to) => (destination[from] = to));
        return Int8Array.from(stickers, sticker => ids.get(destination[sticker]));
    });

    // A state is the 4 white stickers' numbers as one number in base 24
    const applyMove = (state, move) => {
        const table = moved[moves.indexOf(move)];
        return ((table[Math.floor(state / 13824)] * 24 + table[Math.floor(state / 576) % 24]) * 24
            + table[Math.floor(state / 24) % 24]) * 24 + table[state % 24];
    };

    const distances = new Int8Array(24 ** 4).fill(-1);
    const goal = CROSS_EDGES.reduce((state, [white]) => state * 24 + ids.get(white), 0);
    distances[goal] = 0;
    let frontier = [goal];
    while (frontier.length > 0) {
        const next = [];
        for (const state of frontier) {
            const a = Math.floor(state / 13824);
            const b = Math.floor(state / 576) % 24;
            const c = Math.floor(state / 24) % 24;
            const d = state % 24;
            for (const table of moved) {
                const neighbor = ((table[a] * 24 + table[b]) * 24 + table[c]) * 24 + table[d];
                if (distances[neighbor] === -1) {
                    distances[neighbor] = distances[state] + 1;
                    next.push(neighbor);
                }
            }
        }
        frontier = next;
    }

    crossTable = { distances, moves, apply: applyMove };
    return crossTable;
}

// Stage 2: the 4 white corners. Each one is brought above its slot with U turns and put in with
// R U R' U' (as seen from that slot), repeated until it sits right. A corner stuck in the wrong
// slot is popped out first the same way.
function solveWhiteCorners(cube) {
    const triggers = WHITE_CORNER_SIDES.map(([, right]) => parseMoves(`${right} U ${right}' U'`));
    return solvePieceByPiece(cube, CROSS_EDGES, WHITE_CORNERS, slot => combine(
        [[], ...triggers],
        U_TURNS,
        [1, 2, 3, 4, 5].map(times => repeat(triggers[slot], times))
    ));
}

// Stage 3: the 4 middle-layer edges, each brought above its slot with U turns and put in to the
// right (U R U' R' U' F' U F) or to the left (U' L' U L U F U' F'). A stuck edge is popped out first.
function solveMiddleLayer(cube) {
    const insertRight = ([front, right]) => parseMoves(`U ${right} U' ${right}' U' ${front}' U ${front}`);
    const insertLeft = ([front, left]) => parseMoves(`U' ${left}' U ${left} U ${front} U' ${front}'`);
    return solvePieceByPiece(cube, FIRST_LAYER, MIDDLE_EDGES, (slot) => {
        const [front, right] = MIDDLE_EDGE_SIDES[slot];
        return combine(
            [[], ...MIDDLE_EDGE_SIDES.map(insertRight)],
            U_TURNS,
            [insertRight([front, right]), insertLeft([right, front])]
        );
    });
}

// Puts in the pieces one at a time, always the one that takes the fewest moves next, as a person
// would pick the easiest piece. candidatesFor(slot) lists the sequences to try for the piece at that slot.
function solvePieceByPiece(cube, alreadySolved, pieces, candidatesFor) {
    const moves = [];
    const solved = [...alreadySolved];
    const remaining = pieces.map((piece, slot) => ({ piece, slot }));

    while (remaining.length > 0) {
        const options = remaining.map(({ piece, slot }) => ({
            piece,
            moves: shortestWorking(cube, [[], ...candidatesFor(slot)], [...solved, piece], () => true) ?? STUCK
        }));
        const easiest = options.reduce((best, option) => (option.moves.length < best.moves.length ? option : best));
        if (easiest.moves === STUCK) {
            throw new Error('The solver got stuck. Please report this cube.');
        }
        moves.push(...apply(cube, easiest.moves));
        solved.push(easiest.piece);
        remaining.splice(options.indexOf(easiest), 1);
    }
    return moves;
}

// Stage 4: a yellow cross on top, with F R U R' U' F'
function solveYellowCross(cube) {
    const isDone = facelets => [1, 3, 5, 7].every(index => facelets[index] === 'U');
    return searchBlocks(cube, combine(U_TURNS, [parseMoves("F R U R' U' F'")]), 3, [[]], FIRST_TWO_LAYERS, isDone);
}

// Stage 5: the yellow edges matched up with their side centers, with R U R' U R U2 R'
function solveYellowEdges(cube) {
    return searchBlocks(cube, combine(U_TURNS, [parseMoves("R U R' U R U2 R'")]), 4, U_TURNS, [...FIRST_TWO_LAYERS, ...YELLOW_EDGES]);
}

// Stage 6: each yellow corner moved to its own spot (it may still be turned), with U R U' L' U R' U' L
// from any of the four sides
function placeYellowCorners(cube) {
    const cycles = SIDES.map(([, right, left]) => parseMoves(`U ${right} U' ${left}' U ${right}' U' ${left}`));
    const inPlace = facelets => YELLOW_CORNERS.every(corner =>
        sameColors(corner.map(index => facelets[index]), corner.map(index => SOLVED[index]))
    );
    return searchBlocks(cube, cycles, 3, [[]], [...FIRST_TWO_LAYERS, ...YELLOW_EDGES], inPlace);
}

// Stage 7: each yellow corner turned to face up, with R' D' R D on the front-right corner,
// then U to bring up the next one. The first layers come apart in between and are whole again at the end.
function turnYellowCorners(cube) {
    const moves = [];
    const twist = parseMoves("R' D' R D");
    const frontRightIsYellow = facelets => facelets[8] === 'U'; // U9: the top sticker of the front-right corner

    if (cube.isSolved()) {
        return moves;
    }
    for (let corner = 0; corner < 4; corner++) {
        const times = [0, 2, 4].find(count => frontRightIsYellow(after(cube, repeat(twist, count)).facelets));
        moves.push(...apply(cube, [...repeat(twist, times), ...parseMoves('U')]));
    }
    return moves;
}

// Tries sequences made of up to maxBlocks blocks, each block one of `blocks`, followed by one of `endings`.
// Returns (and applies) the shortest one that leaves `pieces` solved and passes isDone.
function searchBlocks(cube, blocks, maxBlocks, endings, pieces, isDone = () => true) {
    let sequences = [[]];
    for (let count = 0; count <= maxBlocks; count++) {
        const found = shortestWorking(cube, combine(sequences, endings), pieces, isDone);
        if (found) {
            return apply(cube, found);
        }
        sequences = combine(sequences, blocks);
    }
    throw new Error('The solver got stuck. Please report this cube.');
}

function shortestWorking(cube, candidates, pieces, isDone) {
    let best = null;
    for (const candidate of candidates) {
        if (best && candidate.length >= best.length) {
            continue;
        }
        const { facelets } = after(cube, candidate);
        if (pieces.every(piece => piece.every(index => facelets[index] === SOLVED[index])) && isDone(facelets)) {
            best = candidate;
        }
    }
    return best;
}

// Every way to pick one sequence from each list, joined together in order
function combine(...lists) {
    return lists.reduce(
        (sequences, list) => sequences.flatMap(sequence => list.map(part => [...sequence, ...part])),
        [[]]
    );
}

function repeat(moves, times) {
    return Array.from({ length: times }, () => moves).flat();
}

function after(cube, moves) {
    return cube.clone().applyMoves(moves);
}

function apply(cube, moves) {
    cube.applyMoves(moves);
    return moves;
}

function sameColors(a, b) {
    return [...a].sort().join('') === [...b].sort().join('');
}

// Joins turns of the same face that follow each other: R R becomes R2, R R' disappears
export function simplify(moves) {
    const result = [];
    for (const move of moves) {
        const last = result.at(-1);
        if (last && last.face === move.face) {
            const quarterTurns = (last.turns + move.turns + 8) % 4;
            result.pop();
            if (quarterTurns !== 0) {
                result.push({ face: move.face, turns: quarterTurns === 3 ? -1 : quarterTurns });
            }
        } else {
            result.push(move);
        }
    }
    return result;
}
