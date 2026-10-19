import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createCameraGuide } from '../../src/scene/cameraGuide.js';

function setUp() {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(3, 3, 5);
    const controls = { target: new THREE.Vector3(0, 0, 0) };
    return { camera, controls, guide: createCameraGuide(camera, controls) };
}

function fly(guide, direction) {
    guide.flyTo(direction);
    for (let frame = 0; frame < 60; frame++) {
        guide.update(1 / 60);
    }
}

describe('createCameraGuide', () => {
    it('ends up looking from the requested direction, at the same distance', () => {
        const { camera, controls, guide } = setUp();
        const distance = camera.position.length();

        fly(guide, [0.25, 1, 0.35]);

        const expected = new THREE.Vector3(0.25, 1, 0.35).normalize().multiplyScalar(distance);
        expect(camera.position.distanceTo(expected)).toBeLessThan(1e-9);
        expect(camera.position.distanceTo(controls.target)).toBeCloseTo(distance, 9);
    });

    it('swings round smoothly, staying at the same distance the whole way', () => {
        const { camera, guide } = setUp();
        const distance = camera.position.length();
        guide.flyTo([1, 0.35, -0.25]);
        for (let frame = 0; frame < 30; frame++) {
            guide.update(1 / 60);
            expect(camera.position.length()).toBeCloseTo(distance, 9);
        }
    });

    it('can turn all the way round to the opposite side', () => {
        const { camera, guide } = setUp();
        const opposite = camera.position.clone().negate();
        fly(guide, opposite.toArray());
        expect(camera.position.distanceTo(opposite)).toBeLessThan(1e-9);
    });

    it('stops moving the camera once it arrives, so orbiting works again', () => {
        const { camera, guide } = setUp();
        fly(guide, [0, 0.35, 1]);
        camera.position.set(4, 0, 0);
        guide.update(1 / 60);
        expect(camera.position.toArray()).toEqual([4, 0, 0]);
    });
});
