// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the face buttons are real HTML elements.

import { describe, it, expect, beforeEach } from 'vitest';
import { createMoveButtons } from '../../src/ui/moveButtons.js';

let commands;
let previews;

beforeEach(() => {
    document.body.innerHTML = '<div id="move-buttons"></div>';
    commands = [];
    previews = [];
    createMoveButtons(command => commands.push(command), face => previews.push(face));
});

function buttons() {
    return [...document.querySelectorAll('#move-buttons button')];
}

describe('createMoveButtons', () => {
    it('builds a row per face with a clockwise and a counterclockwise button', () => {
        expect(buttons().map(button => button.textContent)).toEqual(["U", "U'", 'D', "D'", 'F', "F'", 'B', "B'", 'R', "R'", 'L', "L'"]);
        expect(document.querySelectorAll('.move-row')).toHaveLength(6);
    });

    it("marks each row with its face's color and explains each button", () => {
        const firstRow = document.querySelector('.move-row');
        expect(firstRow.style.getPropertyValue('--face-color')).toBe('#b71234');
        expect(buttons()[0].title).toBe('U: turn the red face clockwise');
        expect(buttons()[1].title).toBe("U': turn the red face counterclockwise");
    });

    it('sends the move when a button is clicked', () => {
        buttons()[9].click();
        expect(commands).toEqual([{ type: 'move', notation: "R'" }]);
    });

    it('previews the face while a button is hovered, and stops when the pointer leaves', () => {
        buttons()[4].dispatchEvent(new Event('pointerenter'));
        buttons()[4].dispatchEvent(new Event('pointerleave'));
        expect(previews).toEqual(['F', null]);
    });
});
