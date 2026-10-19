import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createLights } from '../../src/scene/lights.js';

describe('createLights', () => {
    it('gives a directional light for shading and an ambient light so no side is completely dark', () => {
        const [directional, ambient] = createLights();
        expect(directional).toBeInstanceOf(THREE.DirectionalLight);
        expect(directional.position.toArray()).toEqual([-10, 10, 20]);
        expect(ambient).toBeInstanceOf(THREE.AmbientLight);
    });
});
