import { describe, it, expect, vi } from 'vitest';
import { createCommandRunner } from '../../src/input/commands.js';

function setUp() {
    const cube = { move: vi.fn(), scramble: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), resetToSolved: vi.fn() };
    const openEditor = vi.fn();
    const openHelp = vi.fn();
    const openSolver = vi.fn();
    const afterEach = vi.fn();
    return {
        cube, openEditor, openHelp, openSolver, afterEach,
        runCommand: createCommandRunner({ cube, openEditor, openHelp, openSolver, afterEach })
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

        expect(cube.move).toHaveBeenCalledWith("R'");
        expect(cube.scramble).toHaveBeenCalledOnce();
        expect(cube.undo).toHaveBeenCalledOnce();
        expect(cube.redo).toHaveBeenCalledOnce();
        expect(cube.reset).toHaveBeenCalledOnce();
        expect(cube.resetToSolved).toHaveBeenCalledOnce();
    });

    it('opens the editor, the help and the solution player', () => {
        const { openEditor, openHelp, openSolver, runCommand } = setUp();
        runCommand({ type: 'edit' });
        runCommand({ type: 'help' });
        runCommand({ type: 'solve' });
        expect(openEditor).toHaveBeenCalledOnce();
        expect(openHelp).toHaveBeenCalledOnce();
        expect(openSolver).toHaveBeenCalledOnce();
    });

    it('calls afterEach after every command, e.g. to refresh the buttons', () => {
        const { afterEach, runCommand } = setUp();
        runCommand({ type: 'undo' });
        runCommand({ type: 'move', notation: 'U' });
        expect(afterEach).toHaveBeenCalledTimes(2);
    });

    it('refuses commands it does not know, instead of silently doing nothing', () => {
        const { afterEach, runCommand } = setUp();
        expect(() => runCommand({ type: 'fly' })).toThrow('Unknown command: fly');
        expect(afterEach).not.toHaveBeenCalled();
    });
});
