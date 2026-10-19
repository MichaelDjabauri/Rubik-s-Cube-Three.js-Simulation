import { describe, it, expect } from 'vitest';
import { fitCamera, CUBE_RADIUS, DEFAULT_DISTANCE } from '../../src/scene/camera.js';

const FOV = 75;

// Whether a ball of the cube's radius fits in the free space when seen from `distance`
function cubeFits({ width, height, freeHeight = height }, distance) {
    const tanHalfVertical = Math.tan((FOV * Math.PI / 180) / 2);
    const halfVertical = Math.atan(tanHalfVertical * freeHeight / height);
    const halfHorizontal = Math.atan(tanHalfVertical * width / height);
    return distance * Math.sin(Math.min(halfVertical, halfHorizontal)) >= CUBE_RADIUS;
}

describe('fitCamera', () => {
    it('keeps the usual distance and no offset on a desktop screen', () => {
        expect(fitCamera({ fovDegrees: FOV, width: 1440, height: 900 })).toEqual({ distance: DEFAULT_DISTANCE, offsetY: 0 });
    });

    it('keeps the usual distance on a phone held sideways', () => {
        expect(fitCamera({ fovDegrees: FOV, width: 844, height: 390 }).distance).toBe(DEFAULT_DISTANCE);
    });

    it('moves back far enough to fit the whole cube on an upright phone', () => {
        const screen = { width: 390, height: 844 };
        expect(cubeFits(screen, DEFAULT_DISTANCE)).toBe(false); // The problem: the cube used to be cut off
        const { distance } = fitCamera({ fovDegrees: FOV, ...screen });
        expect(distance).toBeGreaterThan(DEFAULT_DISTANCE);
        expect(cubeFits(screen, distance)).toBe(true);
    });

    it('fits the cube into the space above the buttons and centers it there', () => {
        const screen = { width: 390, height: 844, freeHeight: 680 };
        const { distance, offsetY } = fitCamera({ fovDegrees: FOV, ...screen });
        expect(cubeFits(screen, distance)).toBe(true);
        expect(offsetY).toBe((844 - 680) / 2);
    });

    it('never needs more distance on a wider screen', () => {
        let previous = Infinity;
        for (const width of [320, 390, 600, 900, 1200, 1600]) {
            const { distance } = fitCamera({ fovDegrees: FOV, width, height: 844 });
            expect(distance).toBeLessThanOrEqual(previous);
            previous = distance;
        }
    });
});
