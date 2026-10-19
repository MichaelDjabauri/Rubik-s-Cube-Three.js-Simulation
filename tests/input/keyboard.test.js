import { describe, it, expect, vi } from 'vitest';
import { commandForKey, setUpKeyboard } from '../../src/input/keyboard.js';

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

    it('shows help with the ? key', () => {
        expect(commandForKey(key('?', { shiftKey: true }))).toEqual({ type: 'help' });
        expect(commandForKey(key('?', { shiftKey: true, repeat: true }))).toBeNull();
    });

    it('ignores other keys', () => {
        for (const other of ['z', 'x', 'W', 'Shift', 'Enter', ' ', 'ArrowUp']) {
            expect(commandForKey(key(other)), other).toBeNull();
        }
    });
});

describe('setUpKeyboard', () => {
    function setUp({ openOverlay = null } = {}) {
        const target = new EventTarget();
        const editor = { isOpen: openOverlay === 'editor', close: vi.fn() };
        const help = { isOpen: openOverlay === 'help', close: vi.fn() };
        const runCommand = vi.fn();
        setUpKeyboard({ overlays: [editor, help], runCommand, target });
        return { target, editor, help, runCommand };
    }

    function press(target, fields) {
        const event = new Event('keydown', { cancelable: true });
        Object.assign(event, key(fields.key, fields));
        target.dispatchEvent(event);
        return event;
    }

    it('runs the command for a key, and stops the browser from also handling it', () => {
        const { target, runCommand } = setUp();
        const event = press(target, { key: 'r', shiftKey: true });
        expect(runCommand).toHaveBeenCalledWith({ type: 'move', notation: "R'" });
        expect(event.defaultPrevented).toBe(true);
    });

    it('leaves other keys to the browser', () => {
        const { target, runCommand } = setUp();
        const event = press(target, { key: 'f', ctrlKey: true });
        expect(runCommand).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });

    it('only listens for Escape while the editor is open, which closes it', () => {
        const { target, editor, help, runCommand } = setUp({ openOverlay: 'editor' });
        press(target, { key: 'r' });
        press(target, { key: 'z', ctrlKey: true });
        press(target, { key: '?', shiftKey: true });
        expect(runCommand).not.toHaveBeenCalled();
        expect(editor.close).not.toHaveBeenCalled();

        press(target, { key: 'Escape' });
        expect(editor.close).toHaveBeenCalledOnce();
        expect(help.close).not.toHaveBeenCalled();
    });

    it('closes the help with Escape, and ignores other keys while it is open', () => {
        const { target, editor, help, runCommand } = setUp({ openOverlay: 'help' });
        press(target, { key: 'r' });
        expect(runCommand).not.toHaveBeenCalled();

        press(target, { key: 'Escape' });
        expect(help.close).toHaveBeenCalledOnce();
        expect(editor.close).not.toHaveBeenCalled();
    });
});
