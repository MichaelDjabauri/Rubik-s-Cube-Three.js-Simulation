import CubeState from './CubeState.js';
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
    }

    // Applies moves written in notation, e.g. "R" or "R U R' U2"
    move(notation) {
        this.record(parseMoves(notation));
    }

    // Mixes up the cube with a random sequence of moves, played quickly. Returns its notation.
    // The moves go into the history like any others, so undo and reset work through them.
    scramble(random = Math.random) {
        const scramble = generateScramble(SCRAMBLE_LENGTH, random);
        this.record(parseMoves(scramble), FAST_TURN_DURATION_S);
        this.lastScramble = scramble;
        return scramble;
    }

    // Takes back the last move. Returns the undone move, or null if there was nothing to undo.
    undo() {
        const move = this.history.pop();
        if (!move) {
            return null;
        }
        this.perform(invertMove(move));
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

    // Rewinds every move back to solved, quickly enough to watch
    reset() {
        const rewind = invertMoves(this.history);
        const turnDuration = Math.min(FAST_TURN_DURATION_S, REWIND_MAX_DURATION_S / rewind.length);
        rewind.forEach(move => this.perform(move, turnDuration));

        this.history = [];
        this.redoStack = [];
        this.lastScramble = null;
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
