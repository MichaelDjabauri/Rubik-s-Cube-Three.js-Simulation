import { describe, it, expect, beforeEach } from 'vitest';
import { onDoubleTap } from '../../src/input/doubleTap.js';

let element;
let time;
let doubleTaps;

beforeEach(() => {
    element = new EventTarget();
    time = 0;
    doubleTaps = 0;
    onDoubleTap(element, () => doubleTaps++, () => time);
});

function pointer(type, x, y, pointerId = 1) {
    const event = new Event(type);
    Object.assign(event, { clientX: x, clientY: y, pointerId });
    element.dispatchEvent(event);
}

function tap(x = 100, y = 100, pointerId = 1) {
    pointer('pointerdown', x, y, pointerId);
    pointer('pointerup', x, y, pointerId);
}

describe('onDoubleTap', () => {
    it('fires on two quick taps in the same place', () => {
        tap();
        time += 200;
        tap(103, 98);
        expect(doubleTaps).toBe(1);
    });

    it("doesn't fire for a single tap, or two taps too far apart in time", () => {
        tap();
        expect(doubleTaps).toBe(0);
        time += 600;
        tap();
        expect(doubleTaps).toBe(0);
    });

    it("doesn't fire for two quick taps in different places", () => {
        tap(100, 100);
        time += 100;
        tap(300, 100);
        expect(doubleTaps).toBe(0);
    });

    it("doesn't count a press that turned into a drag", () => {
        tap();
        time += 100;
        pointer('pointerdown', 100, 100);
        pointer('pointerup', 160, 100);
        expect(doubleTaps).toBe(0);

        // And a drag also breaks a pair: the tap after it starts a new count
        time += 100;
        tap();
        expect(doubleTaps).toBe(0);
    });

    it('starts a new pair after firing, so three taps fire only once', () => {
        tap();
        time += 100;
        tap();
        time += 100;
        tap();
        expect(doubleTaps).toBe(1);
    });

    it("doesn't count two-finger gestures like a quick pinch, even with the fingers close together", () => {
        pointer('pointerdown', 100, 100, 1);
        pointer('pointerdown', 104, 100, 2);
        pointer('pointerup', 104, 100, 2);
        pointer('pointerup', 100, 100, 1);
        time += 100;
        tap();
        expect(doubleTaps).toBe(0);
    });

    it("doesn't count a press the browser cancelled", () => {
        tap();
        time += 100;
        pointer('pointerdown', 100, 100);
        pointer('pointercancel', 100, 100);
        time += 100;
        tap();
        expect(doubleTaps).toBe(0);
    });

    it('ignores a release without a press', () => {
        pointer('pointerup', 100, 100);
        expect(doubleTaps).toBe(0);
    });

    it("uses the page's clock by default", () => {
        const other = new EventTarget();
        let fired = 0;
        onDoubleTap(other, () => fired++);
        for (let i = 0; i < 2; i++) {
            for (const type of ['pointerdown', 'pointerup']) {
                const event = new Event(type);
                Object.assign(event, { clientX: 10, clientY: 10, pointerId: 1 });
                other.dispatchEvent(event);
            }
        }
        expect(fired).toBe(1);
    });
});
