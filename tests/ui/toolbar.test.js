// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the toolbar works with real HTML elements.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createToolbar } from '../../src/ui/toolbar.js';

// The real page body from index.html, so the test uses the same buttons as the app, minus the
// script tag that would start the whole app. Tests run from the project folder, so the path is relative to it.
const BODY = readFileSync('index.html', 'utf8')
    .match(/<body>([\s\S]*)<\/body>/)[1]
    .replace(/<script[\s\S]*?<\/script>/, '');

let commands;
let toolbar;

beforeEach(() => {
    document.body.innerHTML = BODY;
    commands = [];
    toolbar = createToolbar(command => commands.push(command.type));
});

function cubeLike({ canUndo = false, canRedo = false, lastScramble = null, startsFromCopy = false } = {}) {
    return { canUndo, canRedo, lastScramble, startsFromCopy };
}

describe('createToolbar', () => {
    it('sends a command for each button', () => {
        for (const id of ['scramble', 'solved', 'undo', 'redo', 'reset', 'edit']) {
            document.querySelector(`#${id}`).click();
        }
        expect(commands).toEqual(['scramble', 'solved', 'undo', 'redo', 'reset', 'edit']);
    });

    it('takes focus off a clicked button, so Space or Enter cannot click it again by accident', () => {
        const undo = document.querySelector('#undo');
        const blur = vi.spyOn(undo, 'blur');
        undo.click();
        expect(blur).toHaveBeenCalled();
    });

    it('greys out Undo, Redo and Reset when they have nothing to do', () => {
        toolbar.update(cubeLike());
        expect(document.querySelector('#undo').disabled).toBe(true);
        expect(document.querySelector('#redo').disabled).toBe(true);
        expect(document.querySelector('#reset').disabled).toBe(true);
        expect(document.querySelector('#scramble').disabled).toBe(false);
        expect(document.querySelector('#edit').disabled).toBe(false);

        toolbar.update(cubeLike({ canUndo: true, canRedo: true }));
        expect(document.querySelector('#undo').disabled).toBe(false);
        expect(document.querySelector('#redo').disabled).toBe(false);
        expect(document.querySelector('#reset').disabled).toBe(false);
    });

    it('shows the latest scramble, and nothing when there is none', () => {
        toolbar.update(cubeLike({ lastScramble: "R U2 F'" }));
        expect(document.querySelector('#cube-info').textContent).toBe("Scramble: R U2 F'");

        toolbar.update(cubeLike());
        expect(document.querySelector('#cube-info').textContent).toBe('');
    });

    it('shows Scramble, and hides Solved cube, for a normal cube', () => {
        toolbar.update(cubeLike());
        expect(document.querySelector('#scramble').hidden).toBe(false);
        expect(document.querySelector('#solved').hidden).toBe(true);
        expect(document.querySelector('#reset').title).toBe('Rewind every move back to the solved cube');
    });

    it('swaps Scramble for Solved cube, and says so at the top, while a copied cube is loaded', () => {
        toolbar.update(cubeLike({ startsFromCopy: true, canUndo: true }));
        expect(document.querySelector('#scramble').hidden).toBe(true);
        expect(document.querySelector('#solved').hidden).toBe(false);
        expect(document.querySelector('#solved').disabled).toBe(false);
        expect(document.querySelector('#reset').title).toBe('Rewind every move back to your colored-in cube');
        expect(document.querySelector('#cube-info').textContent).toBe('Your colored-in cube. Reset goes back to it.');
    });

    it('goes back to the normal buttons after leaving the copied cube', () => {
        toolbar.update(cubeLike({ startsFromCopy: true }));
        toolbar.update(cubeLike());
        expect(document.querySelector('#scramble').hidden).toBe(false);
        expect(document.querySelector('#solved').hidden).toBe(true);
        expect(document.querySelector('#cube-info').textContent).toBe('');
    });
});
