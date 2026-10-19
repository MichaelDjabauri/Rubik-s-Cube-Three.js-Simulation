import CubeState from './CubeState.js';
import RubiksCube from './RubiksCube.js';
import TurnAnimator from './TurnAnimator.js';
import { parseMoves } from './notation.js';

// The cube as the rest of the app sees it: the logical state plus the 3D model that shows it.
// A move updates the state immediately; the 3D model animates afterwards to catch up.
class Cube {
    constructor() {
        this.state = new CubeState();
        this.model = new RubiksCube(); // The THREE.Group to add to the scene
        this.animator = new TurnAnimator(this.model);
    }

    // Applies moves written in notation, e.g. "R" or "R U R' U2"
    move(notation) {
        for (const move of parseMoves(notation)) {
            this.state.applyMove(move);
            this.animator.queueMove(move);
        }
    }

    // Called every frame from the render loop with the seconds since the last frame
    update(deltaSeconds) {
        this.animator.update(deltaSeconds);
    }
}

export default Cube;
