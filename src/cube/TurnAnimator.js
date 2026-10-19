import * as THREE from 'three';
import { FACES } from './faces.js';

const QUARTER_TURN_DURATION_S = 0.2;
const HALF_TURN_DURATION_S = 0.3;

// Animates face turns on the 3D cube one at a time. Turns requested during an animation wait in a queue.
class TurnAnimator {
    constructor(rubiksCube) {
        this.rubiksCube = rubiksCube;
        this.turnQueue = [];
        this.currentTurn = null;

        // The turning layer is attached to this pivot at the cube's center and rotated as one group
        this.pivot = new THREE.Object3D();
        this.rubiksCube.add(this.pivot);
    }

    // move: a parsed move like { face: 'R', turns: 1 } (see notation.js)
    // duration: optional length of the animation in seconds, e.g. shorter for a fast rewind
    queueMove(move, duration = move.turns === 2 ? HALF_TURN_DURATION_S : QUARTER_TURN_DURATION_S) {
        this.turnQueue.push({ ...move, duration });
    }

    // Whether a turn is playing or waiting to play
    get isBusy() {
        return this.currentTurn !== null || this.turnQueue.length > 0;
    }

    // Called every frame from the render loop with the seconds since the last frame.
    // If turns are shorter than a frame, as in a fast rewind, several of them play in one frame.
    update(deltaSeconds) {
        let remaining = deltaSeconds;

        while (remaining > 0) {
            if (!this.currentTurn) {
                if (this.turnQueue.length === 0) {
                    return;
                }
                this.startTurn(this.turnQueue.shift());
            }

            const turn = this.currentTurn;
            const timeLeft = turn.duration - turn.elapsed;

            if (remaining >= timeLeft) {
                remaining -= timeLeft;
                this.pivot.setRotationFromAxisAngle(turn.axis, turn.angle);
                this.completeTurn();
            } else {
                turn.elapsed += remaining;
                remaining = 0;
                this.pivot.setRotationFromAxisAngle(turn.axis, turn.angle * easeInOut(turn.elapsed / turn.duration));
            }
        }
    }

    startTurn({ face, turns, duration }) {
        const { normal } = FACES.find(candidate => candidate.notation === face);

        // Cubelets on a face sit 1 unit out along that face's normal
        const cubelets = this.rubiksCube.cubelets.filter(cubelet => cubelet.position.dot(normal) > 0.5);

        // attach() keeps each cubelet where it is in the world while making it a child of the pivot
        this.pivot.rotation.set(0, 0, 0);
        cubelets.forEach(cubelet => this.pivot.attach(cubelet));

        this.currentTurn = {
            cubelets,
            axis: normal,
            // A clockwise quarter turn, seen from outside the face, is -90° around its outward normal
            angle: -turns * Math.PI / 2,
            duration,
            elapsed: 0
        };
    }

    // Drops every queued turn and stops the current one where it is. The cubelets are left
    // mid-turn, so call this right before putting them somewhere new, e.g. with RubiksCube.setStickers.
    clear() {
        if (this.currentTurn) {
            this.currentTurn.cubelets.forEach(cubelet => this.rubiksCube.attach(cubelet));
            this.pivot.rotation.set(0, 0, 0);
            this.currentTurn = null;
        }
        this.turnQueue = [];
    }

    completeTurn() {
        this.currentTurn.cubelets.forEach(cubelet => {
            this.rubiksCube.attach(cubelet);
            snapToGrid(cubelet);
        });
        this.pivot.rotation.set(0, 0, 0);
        this.currentTurn = null;
    }
}

// Removes floating point error so it can't build up over many turns
function snapToGrid(cubelet) {
    cubelet.position.round();

    // After quarter turns, every entry of a cubelet's rotation matrix is exactly -1, 0 or 1
    const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(cubelet.quaternion);
    rotationMatrix.elements = rotationMatrix.elements.map(Math.round);
    cubelet.quaternion.setFromRotationMatrix(rotationMatrix);
}

// Starts and ends slowly, moving fastest in the middle (t goes from 0 to 1)
function easeInOut(t) {
    return t * t * (3 - 2 * t);
}

export default TurnAnimator;
