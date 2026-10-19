import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createCelebration } from '../../src/scene/celebration.js';

// A small seeded random generator so the confetti flies the same way on every run
function seededRandom(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

let scene;
let cubeModel;
let busy;
let reduceMotion;
let celebration;
let starts;

beforeEach(() => {
    scene = new THREE.Scene();
    cubeModel = new THREE.Group();
    busy = false;
    reduceMotion = false;
    starts = 0;
    celebration = createCelebration({
        scene,
        cubeModel,
        isCubeBusy: () => busy,
        reduceMotion: () => reduceMotion,
        random: seededRandom(1)
    });
});

function confettiMesh() {
    return scene.children.find(child => child instanceof THREE.InstancedMesh);
}

function runFor(seconds, onFrame = () => {}) {
    for (let time = 0; time < seconds; time += 1 / 60) {
        celebration.update(1 / 60);
        onFrame();
    }
}

describe('createCelebration', () => {
    it('waits for the last turn to land, then starts', () => {
        busy = true;
        celebration.play(() => starts++);
        runFor(0.5);
        expect(starts).toBe(0);
        expect(celebration.isPlaying).toBe(true);
        expect(confettiMesh()).toBeUndefined();

        busy = false;
        celebration.update(1 / 60);
        expect(starts).toBe(1);
        expect(confettiMesh()).toBeDefined();
    });

    it('makes the cube hop and spin once, then puts it back exactly where it was', () => {
        celebration.play();
        let highest = 0;
        let turned = 0;
        runFor(0.6, () => {
            highest = Math.max(highest, cubeModel.position.y);
            turned = Math.max(turned, cubeModel.rotation.y);
        });
        expect(highest).toBeGreaterThan(0.5);
        expect(turned).toBeGreaterThan(2);

        runFor(3);
        expect(cubeModel.rotation.y).toBe(0);
        expect(cubeModel.position.y).toBe(0);
    });

    it('throws confetti in all six cube colors, which falls and then disappears', () => {
        celebration.play();
        celebration.update(1 / 60);
        const mesh = confettiMesh();
        expect(mesh.count).toBe(160);

        const colors = new Set();
        for (let i = 0; i < mesh.count; i++) {
            const color = new THREE.Color();
            mesh.getColorAt(i, color);
            colors.add(color.getHexString());
        }
        expect(colors).toEqual(new Set(['009b48', '0046ad', 'b71234', 'ff5800', 'ffffff', 'ffd500']));

        // After a while, gravity has pulled the pieces down on average
        const averageHeight = () => {
            const matrix = new THREE.Matrix4();
            let total = 0;
            for (let i = 0; i < mesh.count; i++) {
                mesh.getMatrixAt(i, matrix);
                total += new THREE.Vector3().setFromMatrixPosition(matrix).y;
            }
            return total / mesh.count;
        };
        runFor(0.2);
        const early = averageHeight();
        runFor(1.5);
        expect(averageHeight()).toBeLessThan(early);

        runFor(1);
        expect(confettiMesh()).toBeUndefined();
        expect(celebration.isPlaying).toBe(false);
    });

    it('can be stopped at any moment, putting the cube back and clearing the confetti', () => {
        celebration.play();
        runFor(0.4);
        celebration.stop();
        expect(cubeModel.rotation.y).toBe(0);
        expect(cubeModel.position.y).toBe(0);
        expect(confettiMesh()).toBeUndefined();
        expect(celebration.isPlaying).toBe(false);
    });

    it('can be stopped while still waiting for the cube, so it never starts', () => {
        busy = true;
        celebration.play(() => starts++);
        celebration.stop();
        busy = false;
        runFor(0.2);
        expect(starts).toBe(0);
    });

    it('only calls onStart, with no hopping or confetti, when the system asks for less motion', () => {
        reduceMotion = true;
        celebration.play(() => starts++);
        runFor(0.5);
        expect(starts).toBe(1);
        expect(cubeModel.position.y).toBe(0);
        expect(cubeModel.rotation.y).toBe(0);
        expect(confettiMesh()).toBeUndefined();
        expect(celebration.isPlaying).toBe(false);
    });

    it('starts over cleanly if the cube is solved again during a party', () => {
        celebration.play(() => starts++);
        runFor(0.5);
        celebration.play(() => starts++);
        runFor(3);
        expect(starts).toBe(2);
        expect(cubeModel.rotation.y).toBe(0);
        expect(confettiMesh()).toBeUndefined();
    });
});
