// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the gallery builds real HTML elements.

import { describe, it, expect, beforeEach } from 'vitest';
import { createGallery, cubePicture } from '../../src/ui/gallery.js';
import { PATTERNS, findPattern } from '../../src/cube/patterns.js';
import Cube from '../../src/cube/Cube.js';
import CubeState, { SOLVED } from '../../src/cube/CubeState.js';
import { FACES } from '../../src/cube/faces.js';
import { formatMoves, invertMoves } from '../../src/cube/notation.js';
import { readFacelets } from '../helpers/readFacelets.js';

const FRAME_SECONDS = 1 / 60;

let cube;
let gallery;
let events;
let answer; // What the stand-in for window.confirm answers

beforeEach(() => {
    document.body.innerHTML = '<button id="gallery-button"></button><div id="gallery" hidden></div>';
    cube = new Cube();
    answer = true;
    events = { changes: 0, beforePlay: 0, repeats: [], questions: [] };
    gallery = createGallery({
        cube,
        onChange: () => events.changes++,
        beforePlay: () => events.beforePlay++,
        onRepeat: moves => events.repeats.push(formatMoves(moves)),
        confirm: (text) => {
            events.questions.push(text);
            return answer;
        }
    });
});

// Runs the render loop for a while
function run(seconds) {
    for (let time = 0; time < seconds; time += FRAME_SECONDS) {
        cube.update(FRAME_SECONDS);
        gallery.update(FRAME_SECONDS);
    }
}

function $(selector) {
    return document.querySelector(selector);
}

function card(name) {
    return [...document.querySelectorAll('.pattern-card')].find(node => node.querySelector('.pattern-name').textContent === name);
}

function button(label) {
    return [...document.querySelectorAll('#gallery button')].find(node => node.textContent === label);
}

function stateOf(id) {
    return new CubeState().applyMoves(findPattern(id).moves).toString();
}

function typeSequence(text) {
    $('.repeat-form input').value = text;
    $('.repeat-form').dispatchEvent(new Event('submit', { cancelable: true }));
}

describe('cubePicture', () => {
    it('draws the top, right and front faces, each a dark square with its 9 stickers in their colors', () => {
        const svg = cubePicture(SOLVED);
        expect(svg.querySelectorAll('.pattern-body')).toHaveLength(3);
        const fills = [...svg.querySelectorAll('polygon:not(.pattern-body)')].map(sticker => sticker.getAttribute('fill'));
        const hex = letter => FACES.find(face => face.notation === letter).hex;
        expect(fills).toEqual([...Array(9).fill(hex('U')), ...Array(9).fill(hex('R')), ...Array(9).fill(hex('F'))]);
    });

    it('shows each pattern as it will look', () => {
        const facelets = stateOf('checkerboard');
        const fills = [...cubePicture(facelets).querySelectorAll('polygon:not(.pattern-body)')].map(sticker => sticker.getAttribute('fill'));
        const expected = [...facelets.slice(0, 27)].map(letter => FACES.find(face => face.notation === letter).hex);
        expect(fills).toEqual(expected);
    });
});

describe('the gallery', () => {
    it('opens from its button, ready to pick a pattern with the keyboard', () => {
        expect(gallery.isOpen).toBe(false);
        $('#gallery-button').click();
        expect(gallery.isOpen).toBe(true);
        expect(document.activeElement).toBe($('.pattern-card'));
    });

    it('closes with its Close button, and a click on the dimmed background but not on the panel', () => {
        gallery.open();
        button('Close').click();
        expect(gallery.isOpen).toBe(false);

        gallery.open();
        $('.gallery-panel').click();
        expect(gallery.isOpen).toBe(true);
        $('#gallery').click();
        expect(gallery.isOpen).toBe(false);
    });

    it('has a card for every pattern, with a picture, what it looks like and its length', () => {
        expect(document.querySelectorAll('.pattern-card')).toHaveLength(PATTERNS.length);
        const checkerboard = card('Checkerboard');
        expect(checkerboard.querySelector('svg')).not.toBeNull();
        expect(checkerboard.querySelector('.pattern-about').textContent).toContain('checkerboard');
        expect(checkerboard.querySelector('.pattern-length').textContent).toBe('6 moves');
        expect(checkerboard.title).toBe('R2 L2 U2 D2 F2 B2');
    });

    it('plays a pattern from a solved cube, one move at a time, at a pace that can be followed', () => {
        gallery.open();
        card('Checkerboard').click();
        expect(gallery.isOpen).toBe(false);
        expect(events.beforePlay).toBe(1);
        expect(cube.lastPattern).toBe('checkerboard');
        expect(cube.history).toEqual([]);

        run(FRAME_SECONDS);
        expect(formatMoves(cube.history)).toBe('R2');
        run(0.3); // The half turn is still landing, then a short pause
        expect(cube.history).toHaveLength(1);
        run(0.2);
        expect(formatMoves(cube.history)).toBe('R2 L2');

        run(3);
        expect(formatMoves(cube.history)).toBe('R2 L2 U2 D2 F2 B2');
        expect(readFacelets(cube.model)).toBe(stateOf('checkerboard'));
        expect(events.changes).toBe(1 + 6);
        expect(gallery.isPlayingPattern).toBe(false);
    });

    it('counts solving a pattern back by hand as a solve', () => {
        const solves = [];
        cube.onSolved = moveCount => solves.push(moveCount);
        card('Checkerboard').click();
        run(4);
        cube.move(formatMoves(invertMoves(cube.history)));
        expect(solves).toEqual([6]);
    });

    it('asks before replacing a cube with progress, and leaves it alone if the answer is no', () => {
        cube.move('R');
        answer = false;
        card('Superflip').click();
        expect(events.questions).toEqual(['Play Superflip? It replaces the cube you have now.']);
        expect(formatMoves(cube.history)).toBe('R');
        expect(cube.lastPattern).toBeNull();

        answer = true;
        card('Superflip').click();
        expect(cube.lastPattern).toBe('superflip');
        expect(cube.history).toEqual([]);
    });

    it('asks before replacing a colored-in cube', () => {
        cube.loadState(stateOf('six-spots'));
        card('Superflip').click();
        expect(events.questions).toHaveLength(1);
    });

    it("doesn't ask when the cube holds only a pattern, finished or not", () => {
        card('Checkerboard').click();
        run(0.5);
        card('Six spots').click();
        run(10);
        card('Python').click();
        expect(events.questions).toEqual([]);
        expect(cube.lastPattern).toBe('python');

        // But moves of the user's own are worth asking about
        run(10);
        cube.move('R');
        card('Superflip').click();
        expect(events.questions).toHaveLength(1);
    });

    it('finishes the rest of a pattern straight away when asked, with quick turns', () => {
        card('Superflip').click();
        run(0.5);
        const changes = events.changes;
        gallery.finishPattern();
        expect(cube.state.toString()).toBe(stateOf('superflip'));
        expect(cube.animator.turnQueue.at(-1).duration).toBeLessThan(0.1);
        expect(cube.currentSolve).toEqual({ moveCount: 0 });
        expect(events.changes).toBe(changes + 1);

        gallery.finishPattern(); // Nothing left to finish
        expect(events.changes).toBe(changes + 1);
    });

    it('drops the rest of a pattern when cancelled', () => {
        card('Superflip').click();
        run(0.1);
        gallery.cancelPattern();
        run(2);
        expect(cube.history).toHaveLength(1);
    });

    it('starts a repeat show from a preset, after finishing a pattern that is still playing', () => {
        card('Checkerboard').click();
        run(0.1);
        gallery.open();
        button('R U').click();
        expect(gallery.isOpen).toBe(false);
        expect(cube.state.toString()).toBe(stateOf('checkerboard'));
        expect(events.repeats).toEqual(['R U']);
        expect(events.beforePlay).toBe(2);
    });

    it('starts a repeat show from a typed sequence', () => {
        gallery.open();
        typeSequence("r u2 f'");
        expect(events.repeats).toEqual(["R U2 F'"]);
        expect(gallery.isOpen).toBe(false);
    });

    it('explains a mistyped sequence, and forgets the message when reopened', () => {
        gallery.open();
        typeSequence('R X');
        expect(events.repeats).toEqual([]);
        expect(gallery.isOpen).toBe(true);
        expect($('.repeat-error').textContent).toContain('face letters');

        typeSequence('R');
        expect($('.repeat-error').textContent).toBe('');

        gallery.open();
        typeSequence('');
        gallery.close();
        gallery.open();
        expect($('.repeat-error').textContent).toBe('');
    });

    it('does nothing in the render loop without a pattern to play', () => {
        run(0.5);
        expect(cube.animator.isBusy).toBe(false);
        expect(events.changes).toBe(0);
    });
});
