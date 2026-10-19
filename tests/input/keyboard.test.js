import { describe, it, expect } from 'vitest';
import { commandForKey } from '../../src/input/keyboard.js';

// A keydown event with no modifier keys, plus any overrides
function key(key, overrides = {}) {
    return { key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, repeat: false, ...overrides };
}

describe('commandForKey', () => {
    it('turns each face clockwise with its letter, lowercase or uppercase', () => {
        for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) {
            expect(commandForKey(key(face.toLowerCase()))).toEqual({ type: 'move', notation: face });
            expect(commandForKey(key(face))).toEqual({ type: 'move', notation: face });
        }
    });

    it('turns counterclockwise with Shift', () => {
        expect(commandForKey(key('R', { shiftKey: true }))).toEqual({ type: 'move', notation: "R'" });
    });

    it('undoes with Ctrl+Z or Cmd+Z', () => {
        expect(commandForKey(key('z', { ctrlKey: true }))).toEqual({ type: 'undo' });
        expect(commandForKey(key('z', { metaKey: true }))).toEqual({ type: 'undo' });
    });

    it('redoes with Ctrl+Shift+Z or Cmd+Shift+Z', () => {
        expect(commandForKey(key('Z', { ctrlKey: true, shiftKey: true }))).toEqual({ type: 'redo' });
        expect(commandForKey(key('Z', { metaKey: true, shiftKey: true }))).toEqual({ type: 'redo' });
    });

    it('keeps undoing while Ctrl+Z is held down', () => {
        expect(commandForKey(key('z', { ctrlKey: true, repeat: true }))).toEqual({ type: 'undo' });
    });

    it('leaves browser shortcuts like Ctrl+F and Cmd+R alone', () => {
        expect(commandForKey(key('f', { ctrlKey: true }))).toBeNull();
        expect(commandForKey(key('r', { metaKey: true }))).toBeNull();
        expect(commandForKey(key('u', { altKey: true }))).toBeNull();
        expect(commandForKey(key('z', { ctrlKey: true, altKey: true }))).toBeNull();
    });

    it('ignores auto-repeat from a held face key', () => {
        expect(commandForKey(key('r', { repeat: true }))).toBeNull();
    });

    it('ignores other keys', () => {
        for (const other of ['z', 'x', 'W', 'Shift', 'Enter', ' ', 'ArrowUp']) {
            expect(commandForKey(key(other)), other).toBeNull();
        }
    });
});
