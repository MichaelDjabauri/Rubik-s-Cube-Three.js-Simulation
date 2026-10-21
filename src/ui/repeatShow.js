import CubeState from '../cube/CubeState.js';
import { parseMove, formatMoves } from '../cube/notation.js';
import { QUARTER_TURN_DURATION_S, HALF_TURN_DURATION_S } from '../cube/TurnAnimator.js';

// Sequences to try, each needing a different number of repeats: 105, 63, 80, 30, 6, and 1260,
// the most any sequence of moves can need
export const REPEAT_PRESETS = ['R U', "R U'", 'R U F', 'R2 U', "R U R' U'", "R U2 D' B D'"];

// Sequences typed by hand are at most this long, so the first two repeats at normal speed stay short
export const MAX_SEQUENCE_LENGTH = 25;

// The whole show takes at most about this long, however many repeats it needs
const SHOW_MAX_S = 20;
// After the first two repeats, turns start at this length and each takes this share of the one before,
// down to FASTEST_TURN_S, or shorter still if the show would otherwise run too long
const FIRST_FAST_TURN_S = 0.2;
const SPEED_UP = 0.95;
const FASTEST_TURN_S = 0.02;
// Speeding up never takes longer than this: the sum of all the turn lengths on the way down
const SPEED_UP_MAX_S = FIRST_FAST_TURN_S / (1 - SPEED_UP);
// How much turning time to keep waiting in line, so even several turns per frame never run out.
// On a slow device, at least two frames' worth.
const LOOKAHEAD_S = 0.1;

// How many times the moves must be repeated to bring the cube back to how it started.
// Every sequence gets there sooner or later, after at most 1260 repeats.
// facelets: the cube's 54 stickers; moves: parsed moves (see notation.js).
export function countRepeats(facelets, moves) {
    const start = [...facelets].join('');
    const state = new CubeState(facelets);
    let repeats = 0;
    do {
        state.applyMoves(moves);
        repeats++;
    } while (state.toString() !== start);
    return repeats;
}

// Reads a sequence typed by hand, e.g. "R U2 F'". Spaces are optional, small letters are read as
// capitals, and the curly apostrophe from copied algorithms works too.
// Returns { moves } with the parsed moves, or { error } with a message saying what's wrong.
export function readSequence(text) {
    const compact = text.replace(/\s+/g, '').replaceAll('’', "'").toUpperCase();
    if (compact === '') {
        return { error: 'Type some moves first, like R U.' };
    }
    if (!/^([UDFBRL]['2]?)+$/.test(compact)) {
        return { error: "Use the face letters U D F B R L, each with ' or 2 after it if you like, e.g. R U2 F'." };
    }
    const moves = compact.match(/[UDFBRL]['2]?/g).map(parseMove);
    if (moves.length > MAX_SEQUENCE_LENGTH) {
        return { error: `That's ${moves.length} moves. Try one with at most ${MAX_SEQUENCE_LENGTH}.` };
    }
    return { moves };
}

// How long each turn of the show takes, by its number from 0. The first two repeats play at normal
// speed (undefined), so the sequence can be followed. Then the turns get faster and faster, down to
// several per frame if needed, so that the whole show takes about SHOW_MAX_S at most.
export function showPace(moves, repeats) {
    const normalTurns = Math.min(2, repeats) * moves.length;
    const normalSeconds = Math.min(2, repeats) * moves.reduce((sum, move) => sum + normalDuration(move), 0);
    const fastTurns = (repeats * moves.length) - normalTurns;
    // Speeding up takes at most SPEED_UP_MAX_S, and the turns after it share what's left
    const timeLeft = Math.max(SHOW_MAX_S - normalSeconds - SPEED_UP_MAX_S, 1);
    const fastest = Math.min(FASTEST_TURN_S, timeLeft / fastTurns);

    return turn => turn < normalTurns
        ? undefined
        : Math.max(FIRST_FAST_TURN_S * SPEED_UP ** (turn - normalTurns), fastest);
}

function normalDuration(move) {
    return move.turns === 2 ? HALF_TURN_DURATION_S : QUARTER_TURN_DURATION_S;
}

// "How many repeats?": the cube repeats a sequence of moves, faster and faster, until it's back where it
// started, with a live count of the repeats. The count is worked out in advance, to set the pace, but
// only shown at the end.
//
// The repeats add up to nothing, so they only turn the 3D model (Cube.showMove) and never go into the
// history: thousands of moves would flood Undo and the history strip. Stop (or Escape) puts the 3D cube
// straight back to where it started, so it always agrees with the cube's state.
// The count follows the turns that have landed on screen, not the ones waiting in line.
//
// It builds its panel into the empty #repeat-show element in index.html. While it's open, the normal
// controls are hidden (the `repeating` class on the page), and keys and sticker drags are off.
//   onFinish        called with { title, detail } for the message when the cube is back where it started
//   onLayoutChange  called when the panel appears or disappears, so the camera can refit
export function createRepeatShow({ cube, onFinish, onLayoutChange }) {
    // The show in progress: its moves, the number of repeats it needs and its pace, how many turns
    // have been handed to the 3D model, and whether it has started (it waits for earlier turns to land)
    let show = null;
    const panel = buildPanel();

    // Starts repeating the moves (parsed moves) from wherever the cube is now
    function start(moves) {
        const repeats = countRepeats(cube.state.facelets, moves);
        show = {
            moves,
            repeats,
            total: repeats * moves.length,
            pace: showPace(moves, repeats),
            backToSolved: cube.state.isSolved(),
            handed: 0,
            started: false
        };

        document.body.classList.add('repeating');
        panel.root.hidden = false;
        panel.sequence.textContent = formatMoves(moves);
        panel.goal.textContent = show.backToSolved
            ? 'Repeating until the cube is solved again'
            : 'Repeating until the cube is back where it started';
        panel.count.textContent = 'Repeat 1';
        onLayoutChange();
    }

    // Stops the show halfway, putting the cube back where it started
    function close() {
        cube.showState();
        end();
    }

    function end() {
        show = null;
        document.body.classList.remove('repeating');
        panel.root.hidden = true;
        onLayoutChange();
    }

    // Called every frame from the render loop, after the cube's own update, with the seconds since the last frame
    function update(deltaSeconds) {
        if (!show) {
            return;
        }
        const { animator } = cube;
        // Earlier turns land first, so every turn in line belongs to the show
        if (!show.started) {
            if (animator.isBusy) {
                return;
            }
            show.started = true;
        }

        const lookahead = Math.max(LOOKAHEAD_S, 2 * deltaSeconds);
        let queued = animator.turnQueue.reduce((sum, turn) => sum + turn.duration, 0);
        while (show.handed < show.total && queued < lookahead) {
            cube.showMove(show.moves[show.handed % show.moves.length], show.pace(show.handed));
            queued += animator.turnQueue.at(-1).duration;
            show.handed++;
        }

        const landed = show.handed - animator.turnQueue.length - (animator.currentTurn ? 1 : 0);
        if (landed === show.total) {
            finish();
            return;
        }
        panel.count.textContent = `Repeat ${Math.floor(landed / show.moves.length) + 1}`;
    }

    function finish() {
        const { repeats, moves, backToSolved } = show;
        end();
        onFinish({
            title: `${repeats} ${repeats === 1 ? 'repeat' : 'repeats'}`,
            detail: `of ${formatMoves(moves)} to get back to ${backToSolved ? 'solved' : 'the start'}`
        });
    }

    // Builds the panel into #repeat-show:
    //   top:    the sequence, what it's repeating for, and the count
    //   bottom: Stop
    function buildPanel() {
        const root = document.querySelector('#repeat-show');
        const sequence = element('p', 'repeat-sequence');
        const goal = element('p', 'repeat-goal');
        const count = element('p', 'repeat-count');

        const stop = document.createElement('button');
        stop.textContent = 'Stop';
        stop.title = 'Stop, and put the cube back where it started (Escape)';
        stop.addEventListener('click', () => {
            stop.blur();
            close();
        });

        root.append(
            element('div', 'repeat-top', [sequence, goal, count]),
            element('div', 'repeat-bottom', [stop])
        );
        return { root, sequence, goal, count };
    }

    return {
        start,
        close,
        update,
        get isOpen() {
            return show !== null;
        }
    };
}

function element(tag, className, children = []) {
    const node = document.createElement(tag);
    node.className = className;
    node.append(...children);
    return node;
}
