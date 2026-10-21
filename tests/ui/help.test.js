// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the help overlay is real HTML.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHelp } from '../../src/ui/help.js';

// The real page body from index.html, minus the script tag that would start the whole app
const BODY = readFileSync('index.html', 'utf8')
    .match(/<body>([\s\S]*)<\/body>/)[1]
    .replace(/<script[\s\S]*?<\/script>/, '');

let help;

beforeEach(() => {
    document.body.innerHTML = BODY;
    help = createHelp();
});

function overlay() {
    return document.querySelector('#help');
}

describe('createHelp', () => {
    it('starts closed', () => {
        expect(help.isOpen).toBe(false);
        expect(overlay().hidden).toBe(true);
    });

    it('opens from the ? button, ready to be closed with Enter', () => {
        document.querySelector('#help-button').click();
        expect(help.isOpen).toBe(true);
        expect(document.activeElement).toBe(document.querySelector('.help-close'));
    });

    it('closes with its Close button', () => {
        help.open();
        document.querySelector('.help-close').click();
        expect(help.isOpen).toBe(false);
    });

    it('closes with a click on the dimmed background, but not on the panel itself', () => {
        help.open();
        document.querySelector('.help-panel').click();
        expect(help.isOpen).toBe(true);
        overlay().click();
        expect(help.isOpen).toBe(false);
    });

    it('explains every kind of control', () => {
        const text = overlay().textContent;
        for (const topic of ['Drag a sticker', 'Shift', 'Double-click or double-tap', 'Scramble', 'Undo', 'Redo', 'Reset', 'Color my cube', 'Notation', 'strip of moves', 'patterns', 'How many repeats?']) {
            expect(text, topic).toContain(topic);
        }
    });
});
