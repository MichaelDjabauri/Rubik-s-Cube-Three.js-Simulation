import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import RubiksCube from '../../src/cube/RubiksCube.js';
import TurnAnimator from '../../src/cube/TurnAnimator.js';
import { FACES } from '../../src/cube/faces.js';
import { parseMoves, invertMoves } from '../../src/cube/notation.js';

const FRAME_SECONDS = 1 / 60;

let cube;
let animator;

beforeEach(() => {
    cube = new RubiksCube();
    animator = new TurnAnimator(cube);
});

// Plays every queued turn to the end, like the render loop would
function finishAllTurns() {
    while (animator.currentTurn || animator.turnQueue.length > 0) {
        animator.update(FRAME_SECONDS);
    }
}

function queue(notation) {
    parseMoves(notation).forEach(move => animator.queueMove(move));
}

function turn(notation) {
    queue(notation);
    finishAllTurns();
}

function cubeletAt(x, y, z) {
    return cube.cubelets.find(cubelet => cubelet.position.equals(new THREE.Vector3(x, y, z)));
}

// Records where every cubelet is and how it is oriented
function snapshot() {
    return cube.cubelets.map(cubelet => ({
        position: cubelet.position.clone(),
        quaternion: cubelet.quaternion.clone()
    }));
}

function expectSameAs(before) {
    cube.cubelets.forEach((cubelet, index) => {
        expect(cubelet.position.equals(before[index].position)).toBe(true);
        // q and -q describe the same rotation, so compare with the absolute dot product
        expect(Math.abs(cubelet.quaternion.dot(before[index].quaternion))).toBeCloseTo(1, 10);
    });
}

// A small seeded random generator so the scramble is the same on every run
function seededRandom(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

describe('TurnAnimator', () => {
    it('turns F (front) clockwise as seen from the front', () => {
        const topEdge = cubeletAt(0, 1, 1);
        turn('F');
        expect(topEdge.position.toArray()).toEqual([1, 0, 1]);
    });

    it('turns U (up) clockwise as seen from above', () => {
        const frontEdge = cubeletAt(0, 1, 1);
        turn('U');
        expect(frontEdge.position.toArray()).toEqual([-1, 1, 0]);
    });

    it("turns F' the opposite way", () => {
        const topEdge = cubeletAt(0, 1, 1);
        turn("F'");
        expect(topEdge.position.toArray()).toEqual([-1, 0, 1]);
    });

    it('turns F2 halfway around as a single, longer turn', () => {
        const topEdge = cubeletAt(0, 1, 1);
        queue('F2');
        animator.update(0.21); // Longer than a quarter turn takes
        expect(animator.currentTurn).not.toBeNull();
        expect(animator.turnQueue).toHaveLength(0);

        finishAllTurns();
        expect(topEdge.position.toArray()).toEqual([0, -1, 1]);
    });

    for (const face of FACES) {
        it(`moves only the 9 cubelets on the ${face.notation} face`, () => {
            const onFace = cubelet => cubelet.position.dot(face.normal) === 1;
            const facePieces = cube.cubelets.filter(onFace);
            const before = snapshot();

            turn(face.notation);

            expect(facePieces).toHaveLength(9);
            facePieces.forEach(cubelet => expect(onFace(cubelet)).toBe(true));
            cube.cubelets.forEach((cubelet, index) => {
                if (!facePieces.includes(cubelet)) {
                    expect(cubelet.position.equals(before[index].position)).toBe(true);
                }
            });
        });

        it(`returns to solved after four ${face.notation} turns`, () => {
            const before = snapshot();
            turn(`${face.notation} ${face.notation} ${face.notation} ${face.notation}`);
            expectSameAs(before);
        });
    }

    it('says whether it is busy, from the first queued turn until the last one lands', () => {
        expect(animator.isBusy).toBe(false);
        queue('F U');
        expect(animator.isBusy).toBe(true);
        animator.update(0.3);
        expect(animator.isBusy).toBe(true);
        finishAllTurns();
        expect(animator.isBusy).toBe(false);
    });

    it('queues turns requested while another turn is animating', () => {
        queue('F');
        animator.update(FRAME_SECONDS);
        queue('U');

        expect(animator.currentTurn).not.toBeNull();
        expect(animator.turnQueue).toHaveLength(1);

        finishAllTurns();
        expect(animator.turnQueue).toHaveLength(0);
        expect(animator.pivot.children).toHaveLength(0);
    });

    it('finishes a turn exactly even after a very long frame', () => {
        const topEdge = cubeletAt(0, 1, 1);
        queue('F');
        animator.update(5);
        expect(animator.currentTurn).toBeNull();
        expect(topEdge.position.toArray()).toEqual([1, 0, 1]);
    });

    it('plays a turn with a custom duration', () => {
        animator.queueMove({ face: 'F', turns: 1 }, 0.05);
        animator.update(0.04);
        expect(animator.currentTurn).not.toBeNull();
        animator.update(0.02);
        expect(animator.currentTurn).toBeNull();
    });

    it('plays several short turns within one frame', () => {
        const topEdge = cubeletAt(0, 1, 1);
        for (const move of parseMoves('F F F')) {
            animator.queueMove(move, 0.005);
        }
        animator.update(FRAME_SECONDS);

        expect(animator.currentTurn).toBeNull();
        expect(animator.turnQueue).toHaveLength(0);
        // Three clockwise turns equal one counterclockwise
        expect(topEdge.position.equals(new THREE.Vector3(-1, 0, 1))).toBe(true);
    });

    it('stays exactly on the grid after a long scramble, and undoing it returns to solved', () => {
        const random = seededRandom(42);
        const suffixes = ['', "'", '2'];
        const before = snapshot();

        const scramble = parseMoves(Array.from({ length: 300 }, () =>
            FACES[Math.floor(random() * FACES.length)].notation + suffixes[Math.floor(random() * 3)]
        ).join(' '));

        // Queue the whole scramble at once and play it with uneven frame times
        scramble.forEach(move => animator.queueMove(move));
        while (animator.currentTurn || animator.turnQueue.length > 0) {
            animator.update(random() * 0.05);
        }

        for (const cubelet of cube.cubelets) {
            for (const coordinate of cubelet.position.toArray()) {
                expect(Number.isInteger(coordinate)).toBe(true);
            }
        }

        invertMoves(scramble).forEach(move => animator.queueMove(move));
        finishAllTurns();
        expectSameAs(before);
    });
});
