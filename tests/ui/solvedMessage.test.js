// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the message is a real HTML element.

import { describe, it, expect, beforeEach } from 'vitest';
import { createSolvedMessage } from '../../src/ui/solvedMessage.js';

let message;

beforeEach(() => {
    document.body.innerHTML = '<div id="solved-message"></div>';
    message = createSolvedMessage();
});

function element() {
    return document.querySelector('#solved-message');
}

describe('createSolvedMessage', () => {
    it('says the cube is solved, with the number of moves, and starts the pop-in animation', () => {
        message.show(23);
        expect(element().querySelector('strong').textContent).toBe('Solved!');
        expect(element().querySelector('span').textContent).toBe('in 23 moves');
        expect(element().classList.contains('show')).toBe(true);
    });

    it('says "move" for a single move', () => {
        message.show(1);
        expect(element().querySelector('span').textContent).toBe('in 1 move');
    });

    it('replaces the previous message when shown again', () => {
        message.show(5);
        message.show(8);
        expect(element().querySelectorAll('strong')).toHaveLength(1);
        expect(element().querySelector('span').textContent).toBe('in 8 moves');
        expect(element().classList.contains('show')).toBe(true);
    });
});
