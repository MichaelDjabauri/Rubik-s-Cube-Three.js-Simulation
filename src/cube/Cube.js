import CubeState, { SOLVED } from './CubeState.js';
import RubiksCube from './RubiksCube.js';
import TurnAnimator from './TurnAnimator.js';
import { parseMoves, invertMove, invertMoves } from './notation.js';
import { generateScramble } from './scramble.js';

// Scrambles and resets play quickly instead of jumping straight to the result
const FAST_TURN_DURATION_S = 0.08;
// After a lot of moves, each rewind turn gets faster so the whole rewind stays this short
const REWIND_MAX_DURATION_S = 2;
const SCRAMBLE_LENGTH = 25;

// The cube as the rest of the app sees it: the logical state plus the 3D model that shows it.
// A move updates the state immediately; the 3D model animates afterwards to catch up.
class Cube {
    constructor() {
        this.state = new CubeState();
        this.model = new RubiksCube(); // The THREE.Group to add to the scene
        this.animator = new TurnAnimator(this.model);

        this.history = [];   // Moves made since the last reset, oldest first
        this.redoStack = []; // Undone moves, most recently undone last
        this.lastScramble = null; // Notation of the latest scramble, until the next reset
        // Whether the starting point is a cube copied in with the editor, rather than the solved cube
        this.startsFromCopy = false;
        this.startFacelets = SOLVED; // The starting point's 54 stickers

        // The solve the user is working on, after a scramble or loading an unsolved copy: { moveCount }
        this.currentSolve = null;
        // Called with the number of moves when the user's own moves solve a scrambled or copied cube
        this.onSolved = () => {};
    }

    // Applies moves written in notation, e.g. "R" or "R U R' U2"
    move(notation) {
        const moves = parseMoves(notation);
        this.record(moves);
        this.checkForSolve(moves.length);
    }

    // Mixes up the cube with a random sequence of moves, played quickly. Returns its notation.
    // The moves go into the history like any others, so undo and reset work through them.
    scramble(random = Math.random) {
        const scramble = generateScramble(SCRAMBLE_LENGTH, random);
        this.record(parseMoves(scramble), FAST_TURN_DURATION_S);
        this.lastScramble = scramble;
        this.beginSolve();
        return scramble;
    }

    // Makes one move of the app's own solution. It goes into the history like any move, but it ends
    // the user's own solve, so the user never gets a celebration for moves the app made.
    playSolutionMove(move, duration) {
        this.record([move], duration);
        this.currentSolve = null;
    }

    // Takes back the last move. Returns the undone move, or null if there was nothing to undo.
    // duration: optional length of the turn in seconds, e.g. shorter when stepping back through a solution quickly
    undo(duration) {
        const move = this.history.pop();
        if (!move) {
            return null;
        }
        this.perform(invertMove(move), duration);
        this.redoStack.push(move);
        return move;
    }

    // Makes the last undone move again. Returns that move, or null if there was nothing to redo.
    redo() {
        const move = this.redoStack.pop();
        if (!move) {
            return null;
        }
        this.perform(move);
        this.history.push(move);
        return move;
    }

    // Replaces the cube with any arrangement of stickers, e.g. one copied from a real cube in the editor.
    // facelets: 54 face letters in CubeState's layout. The new cube becomes the starting point,
    // so the history starts empty and reset rewinds back to it.
    loadState(facelets) {
        this.startFrom(facelets);
        this.startsFromCopy = true;
        this.beginSolve();
    }

    // Leaves a copied cube and starts again from a solved one, straight away
    resetToSolved() {
        this.startFrom(SOLVED);
        this.startsFromCopy = false;
    }

    // Rewinds every move back to the starting point: the solved cube, or a cube loaded with loadState.
    // Quick enough to watch.
    reset() {
        const rewind = invertMoves(this.history);
        const turnDuration = Math.min(FAST_TURN_DURATION_S, REWIND_MAX_DURATION_S / rewind.length);
        rewind.forEach(move => this.perform(move, turnDuration));

        this.history = [];
        this.redoStack = [];
        this.lastScramble = null;
        // Back at a copied cube, the user can try solving it again
        this.beginSolve();
    }

    // Everything needed to bring this cube back later, e.g. after a reload or in a shared link
    // (see cubeCode.js for how it's written down)
    snapshot() {
        return {
            start: this.startsFromCopy ? this.startFacelets : null,
            history: [...this.history],
            redo: [...this.redoStack],
            scramble: this.lastScramble,
            solveMoveCount: this.currentSolve ? this.currentSolve.moveCount : null
        };
    }

    // Brings back a cube from a snapshot, showing it straight away without animating the moves
    restore({ start, history, redo, scramble, solveMoveCount }) {
        this.startFrom(start ?? SOLVED);
        this.startsFromCopy = start !== null;
        this.state.applyMoves(history);
        this.model.setStickers(this.state.facelets);

        this.history = [...history];
        this.redoStack = [...redo];
        this.lastScramble = scramble;
        this.currentSolve = solveMoveCount === null ? null : { moveCount: solveMoveCount };
    }

    get isSolved() {
        return this.state.isSolved();
    }

    get canUndo() {
        return this.history.length > 0;
    }

    get canRedo() {
        return this.redoStack.length > 0;
    }

    // Called every frame from the render loop with the seconds since the last frame
    update(deltaSeconds) {
        this.animator.update(deltaSeconds);
    }

    // Shows the given stickers right away, as the new starting point with an empty history
    startFrom(facelets) {
        this.animator.clear();
        this.startFacelets = [...facelets].join('');
        this.state = new CubeState(facelets);
        this.model.setStickers(this.state.facelets);

        this.history = [];
        this.redoStack = [];
        this.lastScramble = null;
        this.currentSolve = null;
    }

    // Starts counting a new solve, unless the cube is already solved
    beginSolve() {
        this.currentSolve = this.state.isSolved() ? null : { moveCount: 0 };
    }

    // Counts the user's moves towards the current solve, and celebrates if they solved the cube.
    // Only the user's own moves count: undo, redo and reset never set off a celebration.
    checkForSolve(movesMade) {
        if (!this.currentSolve) {
            return;
        }
        this.currentSolve.moveCount += movesMade;
        if (this.state.isSolved()) {
            const { moveCount } = this.currentSolve;
            this.currentSolve = null;
            this.onSolved(moveCount);
        }
    }

    // Performs new moves and adds them to the history.
    // This replaces whatever could have been redone, like in a text editor.
    record(moves, duration) {
        for (const move of moves) {
            this.perform(move, duration);
            this.history.push(move);
        }
        this.redoStack = [];
    }

    // Applies a move to the state right away and queues its animation
    perform(move, duration) {
        this.state.applyMove(move);
        this.animator.queueMove(move, duration);
    }
}

export default Cube;
