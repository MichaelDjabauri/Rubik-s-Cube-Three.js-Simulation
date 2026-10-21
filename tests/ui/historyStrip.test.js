// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the strip is built from real HTML elements.

import { describe, it, expect, beforeEach } from 'vitest';
import { createHistoryStrip } from '../../src/ui/historyStrip.js';
import Cube from '../../src/cube/Cube.js';

let cube;
let commands;
let strip;

beforeEach(() => {
    document.body.innerHTML = '<div id="history-strip"></div>';
    cube = new Cube();
    commands = [];
    strip = createHistoryStrip(command => commands.push(command));
});

function element() {
    return document.querySelector('#history-strip');
}

function chips() {
    return [...element().querySelectorAll('.chip')];
}

function texts(selector = '.chip') {
    return [...element().querySelectorAll(selector)].map(chip => chip.textContent);
}

describe('createHistoryStrip', () => {
    it('is hidden while there are no moves', () => {
        strip.update(cube);
        expect(element().classList.contains('empty')).toBe(true);
    });

    it('shows Start and a chip per move, with the latest move highlighted', () => {
        cube.move("R U' F2");
        strip.update(cube);
        expect(element().classList.contains('empty')).toBe(false);
        expect(texts()).toEqual(['Start', 'R', "U'", 'F2']);
        expect(texts('.current')).toEqual(['F2']);
        expect(element().querySelector('[aria-current="step"]').textContent).toBe('F2');
        expect(texts('.ahead')).toEqual([]);
    });

    it('shows the moves that can be redone after the latest one, dimmed', () => {
        cube.move("R U' F2");
        cube.undo();
        cube.undo();
        strip.update(cube);
        expect(texts()).toEqual(['Start', 'R', "U'", 'F2']);
        expect(texts('.current')).toEqual(['R']);
        expect(texts('.ahead')).toEqual(["U'", 'F2']);
    });

    it('highlights Start when every move has been undone', () => {
        cube.move('R');
        cube.undo();
        strip.update(cube);
        expect(element().classList.contains('empty')).toBe(false);
        expect(texts('.current')).toEqual(['Start']);
    });

    it('travels to just after a move when its chip is tapped, and to the beginning with Start', () => {
        cube.move("R U' F2");
        strip.update(cube);
        chips()[2].click();
        chips()[0].click();
        expect(commands).toEqual([{ type: 'travel', to: 2 }, { type: 'travel', to: 0 }]);
    });

    it('replaces the moves to redo when a new move is made', () => {
        cube.move("R U' F2");
        cube.undo();
        cube.undo();
        cube.move('D');
        strip.update(cube);
        expect(texts()).toEqual(['Start', 'R', 'D']);
        expect(texts('.current')).toEqual(['D']);
    });

    it('keeps the chips it already has when moves are added', () => {
        cube.move('R U');
        strip.update(cube);
        const first = chips()[1];
        cube.move('F');
        strip.update(cube);
        expect(chips()[1]).toBe(first);
        expect(texts()).toEqual(['Start', 'R', 'U', 'F']);
    });

    it('empties again after a reset', () => {
        cube.move('R U');
        strip.update(cube);
        cube.reset();
        strip.update(cube);
        expect(texts()).toEqual(['Start']);
        expect(element().classList.contains('empty')).toBe(true);
    });

    it('scrolls the highlighted chip into the middle', () => {
        cube.move('R U F');
        Object.defineProperty(element(), 'clientWidth', { value: 300 });
        strip.update(cube);
        const latest = chips()[3];
        Object.defineProperty(latest, 'offsetLeft', { value: 500 });
        Object.defineProperty(latest, 'offsetWidth', { value: 40 });
        strip.update(cube);
        expect(element().scrollLeft).toBe(500 - (300 - 40) / 2);
    });

    it('scrolls sideways with a mouse wheel', () => {
        const down = new WheelEvent('wheel', { deltaY: 60, cancelable: true });
        element().dispatchEvent(down);
        expect(element().scrollLeft).toBe(60);
        expect(down.defaultPrevented).toBe(true);

        // A sideways scroll, e.g. on a trackpad, is left to the browser
        const sideways = new WheelEvent('wheel', { deltaX: 30, deltaY: 5, cancelable: true });
        element().dispatchEvent(sideways);
        expect(sideways.defaultPrevented).toBe(false);
    });
});
