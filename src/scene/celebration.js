import * as THREE from 'three';
import { FACES } from '../cube/faces.js';

const SPIN_DURATION_S = 1.2;
const HOP_HEIGHT = 0.6;

const CONFETTI_COUNT = 160;
const CONFETTI_SIZE = 0.14;
const CONFETTI_LIFETIME_S = 2.4;
const CONFETTI_SHRINK_S = 0.5; // Pieces shrink away during their last half second
const GRAVITY = -6;

// The little party when the user solves the cube: the cube hops and spins once, and confetti in the
// six cube colors bursts out of it and tumbles down.
//
// isCubeBusy: returns true while turns are still animating; the party waits for the last turn to land.
// reduceMotion: returns true when the user's system asks for less motion; then only onStart runs.
// random: returns a number from 0 up to 1, like Math.random; tests pass a seeded one.
export function createCelebration({ scene, cubeModel, isCubeBusy, reduceMotion, random = Math.random }) {
    const confetti = createConfetti(random);
    let waiting = null; // { onStart }, until the cube stops turning
    let elapsed = null; // Seconds since the party started, or null when there's no party

    // Starts the party once the cube has finished turning. onStart is called at that moment,
    // e.g. to show a message alongside it.
    function play(onStart = () => {}) {
        waiting = { onStart };
    }

    function start() {
        const { onStart } = waiting;
        waiting = null;
        onStart();
        if (reduceMotion()) {
            return;
        }
        elapsed = 0;
        confetti.launch();
        scene.add(confetti.mesh);
    }

    // Ends the party straight away and puts the cube back in place
    function stop() {
        waiting = null;
        elapsed = null;
        cubeModel.rotation.y = 0;
        cubeModel.position.y = 0;
        scene.remove(confetti.mesh);
    }

    // Called every frame from the render loop with the seconds since the last frame
    function update(deltaSeconds) {
        if (waiting && !isCubeBusy()) {
            start();
        }
        if (elapsed === null) {
            return;
        }

        elapsed += deltaSeconds;

        // One full spin around the vertical axis, with a hop that peaks halfway
        const spin = Math.min(elapsed / SPIN_DURATION_S, 1);
        cubeModel.rotation.y = 2 * Math.PI * easeInOut(spin);
        cubeModel.position.y = HOP_HEIGHT * Math.sin(Math.PI * spin);

        confetti.update(deltaSeconds, elapsed);

        if (elapsed >= CONFETTI_LIFETIME_S) {
            stop();
        }
    }

    return {
        play,
        stop,
        update,
        // Whether a party is playing or about to start
        get isPlaying() {
            return waiting !== null || elapsed !== null;
        }
    };
}

// Confetti pieces as one InstancedMesh: many copies of a small square, each with its own color,
// position and spin, drawn in a single go
function createConfetti(random) {
    const mesh = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(CONFETTI_SIZE, CONFETTI_SIZE),
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
        CONFETTI_COUNT
    );
    const pieces = Array.from({ length: CONFETTI_COUNT }, () => ({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        spin: new THREE.Vector3()
    }));
    pieces.forEach((_, index) => mesh.setColorAt(index, new THREE.Color(FACES[index % FACES.length].hex)));

    const placement = new THREE.Object3D(); // Used to work out each piece's position, rotation and size

    // Puts every piece just outside the cube and throws it outwards and upwards
    function launch() {
        for (const piece of pieces) {
            const direction = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
            piece.position.copy(direction).multiplyScalar(1.6);
            piece.velocity.copy(direction).multiplyScalar(2 + 3 * random());
            piece.velocity.y += 3 + 2 * random();
            piece.rotation.set(random() * Math.PI, random() * Math.PI, 0);
            piece.spin.set(random() * 10 - 5, random() * 10 - 5, random() * 10 - 5);
        }
    }

    function update(deltaSeconds, elapsed) {
        const scale = Math.min(1, (CONFETTI_LIFETIME_S - elapsed) / CONFETTI_SHRINK_S);

        pieces.forEach((piece, index) => {
            piece.velocity.y += GRAVITY * deltaSeconds;
            piece.position.addScaledVector(piece.velocity, deltaSeconds);
            piece.rotation.x += piece.spin.x * deltaSeconds;
            piece.rotation.y += piece.spin.y * deltaSeconds;
            piece.rotation.z += piece.spin.z * deltaSeconds;

            placement.position.copy(piece.position);
            placement.rotation.copy(piece.rotation);
            placement.scale.setScalar(Math.max(scale, 0));
            placement.updateMatrix();
            mesh.setMatrixAt(index, placement.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
    }

    return { mesh, pieces, launch, update };
}

// Starts and ends slowly, moving fastest in the middle (t goes from 0 to 1)
function easeInOut(t) {
    return t * t * (3 - 2 * t);
}
