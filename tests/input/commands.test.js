import { describe, it, expect, vi } from 'vitest';
import { createCommandRunner } from '../../src/input/commands.js';

function setUp() {
    const cube = {
        move: vi.fn(), scramble: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), resetToSolved: vi.fn(), travelTo: vi.fn()
    };
    const openEditor = vi.fn();
    const openHelp = vi.fn();
    const openSolver = vi.fn();
    const openGallery = vi.fn();
    const beforeEach = vi.fn();
    const afterEach = vi.fn();
    return {
        cube, openEditor, openHelp, openSolver, openGallery, beforeEach, afterEach,
        runCommand: createCommandRunner({ cube, openEditor, openHelp, openSolver, openGallery, beforeEach, afterEach })
    };
}

describe('createCommandRunner', () => {
    it('runs each kind of command on the cube', () => {
        const { cube, runCommand } = setUp();
        runCommand({ type: 'move', notation: "R'" });
        runCommand({ type: 'scramble' });
        runCommand({ type: 'undo' });
        runCommand({ type: 'redo' });
        runCommand({ type: 'reset' });
        runCommand({ type: 'solved' });
        runCommand({ type: 'travel', to: 3 });

        expect(cube.move).toHaveBeenCalledWith("R'");
        expect(cube.scramble).toHaveBeenCalledOnce();
        expect(cube.undo).toHaveBeenCalledOnce();
        expect(cube.redo).toHaveBeenCalledOnce();
        expect(cube.reset).toHaveBeenCalledOnce();
        expect(cube.resetToSolved).toHaveBeenCalledOnce();
        expect(cube.travelTo).toHaveBeenCalledWith(3);
    });

    it('opens the editor, the help, the solution player and the pattern gallery', () => {
        const { openEditor, openHelp, openSolver, openGallery, runCommand } = setUp();
        runCommand({ type: 'edit' });
        runCommand({ type: 'help' });
        runCommand({ type: 'solve' });
        runCommand({ type: 'patterns' });
        expect(openEditor).toHaveBeenCalledOnce();
        expect(openHelp).toHaveBeenCalledOnce();
        expect(openSolver).toHaveBeenCalledOnce();
        expect(openGallery).toHaveBeenCalledOnce();
    });

    it('calls beforeEach before every command and afterEach after it, e.g. to refresh the buttons', () => {
        const { cube, beforeEach, afterEach, runCommand } = setUp();
        const order = [];
        beforeEach.mockImplementation(() => order.push('before'));
        cube.undo.mockImplementation(() => order.push('undo'));
        afterEach.mockImplementation(() => order.push('after'));
        runCommand({ type: 'undo' });
        runCommand({ type: 'move', notation: 'U' });
        expect(beforeEach).toHaveBeenCalledTimes(2);
        expect(afterEach).toHaveBeenCalledTimes(2);
        expect(order.slice(0, 3)).toEqual(['before', 'undo', 'after']);
    });

    it('works without beforeEach', () => {
        const cube = { undo: vi.fn() };
        createCommandRunner({ cube, afterEach: () => {} })({ type: 'undo' });
        expect(cube.undo).toHaveBeenCalledOnce();
    });

    it('refuses commands it does not know, instead of silently doing nothing', () => {
        const { beforeEach, afterEach, runCommand } = setUp();
        expect(() => runCommand({ type: 'fly' })).toThrow('Unknown command: fly');
        expect(afterEach).not.toHaveBeenCalled();
        expect(beforeEach).not.toHaveBeenCalled();
    });
});
