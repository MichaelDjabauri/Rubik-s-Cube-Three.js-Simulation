// @vitest-environment happy-dom
// Runs in a simulated web page, because the camera takes its shape from the window size.

import { describe, it, expect } from 'vitest';
import { createCamera, DEFAULT_DISTANCE } from '../../src/scene/camera.js';

describe('createCamera', () => {
    it('matches the window shape and starts at the usual distance, looking from the front, right and above', () => {
        window.innerWidth = 1200;
        window.innerHeight = 800;
        const camera = createCamera();

        expect(camera.aspect).toBe(1.5);
        expect(camera.fov).toBe(75);
        expect(camera.position.toArray()).toEqual([3, 3, 5]);
        expect(camera.position.length()).toBe(DEFAULT_DISTANCE);
    });
});
