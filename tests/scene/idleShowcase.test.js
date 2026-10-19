import { describe, it, expect, beforeEach } from 'vitest';
import { createIdleShowcase } from '../../src/scene/idleShowcase.js';

let controls;
let target;
let allowed;
let showcase;

beforeEach(() => {
    controls = { autoRotate: false, autoRotateSpeed: 0 };
    target = new EventTarget();
    allowed = true;
    showcase = createIdleShowcase({ controls, canRun: () => allowed, target });
});

function wait(seconds) {
    for (let time = 0; time < seconds; time += 0.1) {
        showcase.update(0.1);
    }
}

describe('createIdleShowcase', () => {
    it('does nothing for the first 15 seconds', () => {
        wait(14.5);
        expect(controls.autoRotate).toBe(false);
    });

    it('then slowly circles the camera, speeding up gently', () => {
        wait(15.5);
        expect(controls.autoRotate).toBe(true);
        const early = controls.autoRotateSpeed;
        wait(3);
        expect(controls.autoRotateSpeed).toBeGreaterThan(early);
        expect(controls.autoRotateSpeed).toBe(1.5);
    });

    it('stops the moment there is any input, and starts the wait over', () => {
        for (const type of ['pointerdown', 'pointermove', 'wheel', 'keydown']) {
            wait(16);
            expect(controls.autoRotate, type).toBe(true);
            target.dispatchEvent(new Event(type));
            expect(controls.autoRotate, type).toBe(false);
            wait(10);
            expect(controls.autoRotate, type).toBe(false);
            wait(10);
        }
    });

    it("doesn't run while it isn't allowed, e.g. while the editor is open, and waits again afterwards", () => {
        wait(16);
        allowed = false;
        showcase.update(0.1);
        expect(controls.autoRotate).toBe(false);
        wait(30);
        expect(controls.autoRotate).toBe(false);

        allowed = true;
        wait(10);
        expect(controls.autoRotate).toBe(false);
        wait(6);
        expect(controls.autoRotate).toBe(true);
    });
});
