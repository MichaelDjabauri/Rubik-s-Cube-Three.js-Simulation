import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createLights, createShadowFloor } from '../../src/scene/lights.js';

// addEnvironment needs a real WebGL renderer, so the smoke test in tests/main.test.js covers it

describe('createLights', () => {
    it('gives a key light from above that casts a soft shadow', () => {
        const [key] = createLights();
        expect(key).toBeInstanceOf(THREE.DirectionalLight);
        expect(key.castShadow).toBe(true);
        expect(key.position.y).toBeGreaterThan(Math.abs(key.position.x));
        expect(key.position.y).toBeGreaterThan(Math.abs(key.position.z));
        expect(key.shadow.radius).toBeGreaterThan(1);
    });

    it('lights every side of the cube directly, so no side is completely dark', () => {
        const directions = createLights()
            .filter(light => light instanceof THREE.DirectionalLight)
            .map(light => light.position.clone().normalize());
        const sides = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]].map(side => new THREE.Vector3(...side));
        for (const side of sides) {
            expect(directions.some(direction => direction.dot(side) > 0.2), side.toArray().join(',')).toBe(true);
        }
        // The bottom gets the hemisphere light's ground color
        expect(createLights().some(light => light instanceof THREE.HemisphereLight)).toBe(true);
    });

    it("keeps the shadow's box around the whole floor, so the shadow never gets cut off", () => {
        const [key] = createLights();
        const floor = createShadowFloor();
        const radius = floor.geometry.parameters.radius;
        expect(key.shadow.camera.right).toBeGreaterThanOrEqual(radius);
        expect(key.shadow.camera.top).toBeGreaterThanOrEqual(radius);
    });
});

describe('createShadowFloor', () => {
    it('lies flat below the cube, facing up, and only shows shadows', () => {
        const floor = createShadowFloor();
        expect(floor.material).toBeInstanceOf(THREE.ShadowMaterial);
        expect(floor.receiveShadow).toBe(true);
        // Below the lowest a turning layer ever reaches: a corner tilted 45° mid-turn
        expect(floor.position.y).toBeLessThan(-1.5 * Math.SQRT2);
        // One-sided and facing up, so it can't be seen from below
        expect(floor.material.side).toBe(THREE.FrontSide);
        const up = new THREE.Vector3(0, 0, 1).applyEuler(floor.rotation);
        expect(up.y).toBeCloseTo(1);
    });
});
