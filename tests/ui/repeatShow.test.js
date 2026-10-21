// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the show builds real HTML elements.

import { describe, it, expect, beforeEach } from 'vitest';
import {
    createRepeatShow, countRepeats, readSequence, showPace, REPEAT_PRESETS, MAX_SEQUENCE_LENGTH
} from '../../src/ui/repeatShow.js';
import Cube from '../../src/cube/Cube.js';
import CubeState, { SOLVED } from '../../src/cube/CubeState.js';
import { parseMoves, formatMoves } from '../../src/cube/notation.js';
import { readFacelets } from '../helpers/readFacelets.js';

const FRAME_SECONDS = 1 / 60;
const SCRAMBLED = new CubeState().applyMoves(parseMoves("F2 D' L B2 U R' F D2")).toString();

let cube;
let show;
let events;

beforeEach(() => {
    document.body.innerHTML = '<div id="repeat-show" hidden></div>';
    document.body.className = '';
    cube = new Cube();
    events = { finished: [], layouts: 0 };
    show = createRepeatShow({
        cube,
        onFinish: message => events.finished.push(message),
        onLayoutChange: () => events.layouts++
    });
});

// Runs the render loop for a while, or until the show is over. Returns the seconds it ran.
function run(seconds = Infinity, frameSeconds = FRAME_SECONDS) {
    let time = 0;
    while (time < seconds && (show.isOpen || seconds !== Infinity)) {
        cube.update(frameSeconds);
        show.update(frameSeconds);
        time += frameSeconds;
    }
    return time;
}

function $(selector) {
    return document.querySelector(selector);
}

// The number in "Repeat 37"
function shownCount() {
    return Number($('.repeat-count').textContent.replace('Repeat ', ''));
}

describe('countRepeats', () => {
    it('knows that R U takes 105 repeats to get back to solved', () => {
        expect(countRepeats(SOLVED, parseMoves('R U'))).toBe(105);
    });

    it('gives each preset its own number of repeats', () => {
        const counts = REPEAT_PRESETS.map(preset => countRepeats(SOLVED, parseMoves(preset)));
        expect(counts).toEqual([105, 63, 80, 30, 6, 1260]);
    });

    it('counts the same from a scrambled cube, back to that scrambled cube', () => {
        expect(countRepeats(SCRAMBLED, parseMoves('R U'))).toBe(105);
        expect(countRepeats(SCRAMBLED, parseMoves("R R'"))).toBe(1);
    });
});

describe('readSequence', () => {
    it('reads moves with or without spaces, in small letters, and with curly apostrophes', () => {
        for (const text of ["R U2 F'", "RU2F'", "r u2 f'", 'R U2 F’', "  R  U2\tF' "]) {
            expect(formatMoves(readSequence(text).moves), text).toBe("R U2 F'");
        }
    });

    it('explains what is wrong with anything else', () => {
        expect(readSequence('   ').error).toContain('Type some moves');
        expect(readSequence('R X').error).toContain('face letters');
        expect(readSequence("R2'").error).toContain('face letters');
        expect(readSequence('R'.repeat(MAX_SEQUENCE_LENGTH)).moves).toHaveLength(MAX_SEQUENCE_LENGTH);
        expect(readSequence('R'.repeat(MAX_SEQUENCE_LENGTH + 1)).error).toContain(`at most ${MAX_SEQUENCE_LENGTH}`);
    });
});

describe('showPace', () => {
    // The length of the whole show, playing each turn at its pace (normal speed as in TurnAnimator)
    function totalSeconds(moves, repeats) {
        const pace = showPace(moves, repeats);
        let total = 0;
        for (let turn = 0; turn < moves.length * repeats; turn++) {
            const move = moves[turn % moves.length];
            total += pace(turn) ?? (move.turns === 2 ? 0.3 : 0.2);
        }
        return total;
    }

    it('plays the first two repeats at normal speed, then faster and faster', () => {
        const moves = parseMoves('R U');
        const pace = showPace(moves, 105);
        expect([0, 1, 2, 3].map(pace)).toEqual([undefined, undefined, undefined, undefined]);
        expect(pace(4)).toBe(0.2);
        expect(pace(5)).toBeLessThan(pace(4));
        expect(pace(50)).toBeLessThan(pace(5));
    });

    it('keeps even the longest show to about 20 seconds', () => {
        expect(totalSeconds(parseMoves('R U'), 105)).toBeLessThan(10);
        expect(totalSeconds(parseMoves("R U2 D' B D'"), 1260)).toBeLessThan(20.5);
        const long = readSequence("R U2 D' B D' ".repeat(5)).moves;
        expect(totalSeconds(long, 1260)).toBeLessThan(25);
    });

    it('plays a short show at normal speed all the way', () => {
        const pace = showPace(parseMoves("R R'"), 1);
        expect([0, 1].map(pace)).toEqual([undefined, undefined]);
    });
});

describe('the repeat show', () => {
    it('opens its panel over the hidden controls, with the sequence', () => {
        show.start(parseMoves('R U'));
        expect(show.isOpen).toBe(true);
        expect(document.body.classList.contains('repeating')).toBe(true);
        expect($('#repeat-show').hidden).toBe(false);
        expect($('.repeat-sequence').textContent).toBe('R U');
        expect($('.repeat-goal').textContent).toBe('Repeating until the cube is solved again');
        expect($('.repeat-count').textContent).toBe('Repeat 1');
        expect(events.layouts).toBe(1);
    });

    it('counts each repeat once its turns have landed', () => {
        show.start(parseMoves('R U'));
        run(0.3); // R has landed, U hasn't
        expect(shownCount()).toBe(1);
        run(0.2);
        expect(shownCount()).toBe(2);
    });

    it('repeats R U 105 times, ends back at solved, and says so', () => {
        show.start(parseMoves('R U'));
        let highest = 0;
        while (show.isOpen) {
            run(0.5);
            if (show.isOpen) {
                expect(shownCount()).toBeGreaterThanOrEqual(highest); // Only ever counts up
                highest = shownCount();
            }
        }
        expect(highest).toBeLessThanOrEqual(105);
        expect(events.finished).toEqual([{ title: '105 repeats', detail: 'of R U to get back to solved' }]);
        expect(document.body.classList.contains('repeating')).toBe(false);
        expect($('#repeat-show').hidden).toBe(true);
        expect(readFacelets(cube.model)).toBe(SOLVED);
    });

    it('never touches the history or the state', () => {
        cube.move('F');
        run(0.5);
        show.start(parseMoves('R U'));
        run(3);
        expect(formatMoves(cube.history)).toBe('F');
        expect(cube.state.toString()).toBe(new CubeState().applyMoves(parseMoves('F')).toString());
    });

    it('gets through even 1260 repeats in about 20 seconds', { timeout: 30000 }, () => {
        show.start(parseMoves("R U2 D' B D'"));
        expect(run()).toBeLessThan(21);
        expect(events.finished[0].title).toBe('1260 repeats');
        expect(readFacelets(cube.model)).toBe(SOLVED);
    });

    it('keeps to its pace on a slow device, with long frames', { timeout: 30000 }, () => {
        show.start(parseMoves("R U2 D' B D'"));
        expect(run(Infinity, 0.25)).toBeLessThan(21);
        expect(events.finished[0].title).toBe('1260 repeats');
    });

    it('works from a scrambled cube, back to where it started', () => {
        cube.loadState(SCRAMBLED);
        show.start(parseMoves("R U R' U'"));
        expect($('.repeat-goal').textContent).toBe('Repeating until the cube is back where it started');
        run();
        expect(events.finished).toEqual([{ title: '6 repeats', detail: "of R U R' U' to get back to the start" }]);
        expect(readFacelets(cube.model)).toBe(SCRAMBLED);
    });

    it('says "1 repeat" for a sequence that changes nothing', () => {
        show.start(parseMoves("R R'"));
        run();
        expect(events.finished[0].title).toBe('1 repeat');
    });

    it('lets turns made before it land first, and counts only its own', () => {
        cube.move('F B');
        show.start(parseMoves('R U'));
        run(0.3); // Still landing F and B
        expect(cube.animator.turnQueue.every(turn => turn.face === 'F' || turn.face === 'B')).toBe(true);
        run();
        expect(events.finished[0].title).toBe('105 repeats');
        expect(readFacelets(cube.model)).toBe(cube.state.toString());
    });

    it('stops halfway with Stop, putting the cube straight back where it started', () => {
        cube.loadState(SCRAMBLED);
        show.start(parseMoves('R U'));
        run(2.05);
        [...document.querySelectorAll('#repeat-show button')].find(button => button.textContent === 'Stop').click();
        expect(show.isOpen).toBe(false);
        expect(cube.animator.isBusy).toBe(false);
        expect(readFacelets(cube.model)).toBe(SCRAMBLED);
        expect(events.finished).toEqual([]);
        expect(events.layouts).toBe(2);
        show.update(FRAME_SECONDS); // Does nothing once stopped
        expect(cube.animator.isBusy).toBe(false);
    });
});
