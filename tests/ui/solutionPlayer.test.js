// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the player builds real HTML elements.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSolutionPlayer, describeMove } from '../../src/ui/solutionPlayer.js';
import Cube from '../../src/cube/Cube.js';
import { parseMoves, formatMoves } from '../../src/cube/notation.js';
import { STAGE_NAMES } from '../../src/cube/solver.js';
import { readFacelets } from '../helpers/readFacelets.js';

const FRAME_SECONDS = 1 / 60;

let cube;
let controls;
let player;
let events;
let reduceMotion;

function setUp() {
    document.body.innerHTML = '<div id="player" hidden></div>';
    document.body.className = '';
    cube = new Cube();
    controls = { autoRotate: false, autoRotateSpeed: 0 };
    reduceMotion = false;
    events = { finished: [], changes: 0, shared: [], messages: [], layouts: 0, closes: 0 };
    player = createSolutionPlayer({
        cube,
        controls,
        reduceMotion: () => reduceMotion,
        onFinish: moveCount => events.finished.push(moveCount),
        onChange: () => events.changes++,
        onShare: (snapshot, solution) => events.shared.push({ snapshot, solution }),
        showMessage: text => events.messages.push(text),
        onLayoutChange: () => events.layouts++,
        onClose: () => events.closes++
    });
}

beforeEach(setUp);

// Runs the render loop for a while
function run(seconds) {
    for (let time = 0; time < seconds; time += FRAME_SECONDS) {
        cube.update(FRAME_SECONDS);
        player.update(FRAME_SECONDS);
    }
}

function $(selector) {
    return document.querySelector(selector);
}

function button(label) {
    return [...document.querySelectorAll('#player button')].find(candidate => candidate.textContent === label);
}

// The length of the turn playing now, or the next one in line
function turnDuration() {
    return (cube.animator.currentTurn ?? cube.animator.turnQueue[0]).duration;
}

function key(name) {
    return player.handleKey({ key: name });
}

// A short solution by hand, to keep tests quick: undoes "R U" in two stages
const SHORT_SOLUTION = {
    stages: STAGE_NAMES.map((name, index) => ({ name, moves: index === 2 ? parseMoves("U'") : index === 4 ? parseMoves("R'") : [] })),
    moves: parseMoves("U' R'")
};

describe('describeMove', () => {
    it('says how to turn each face in plain words', () => {
        expect(describeMove({ face: 'R', turns: 1 })).toBe('Turn the right (green) face so the front goes up');
        expect(describeMove({ face: 'R', turns: -1 })).toBe('Turn the right (green) face so the front goes down');
        expect(describeMove({ face: 'U', turns: 1 })).toBe('Turn the top (red) face so the front goes left');
        expect(describeMove({ face: 'F', turns: -1 })).toBe('Turn the front (white) face so the top goes left');
        expect(describeMove({ face: 'B', turns: 2 })).toBe('Turn the back (yellow) face halfway around');
    });
});

describe('the solution player', () => {
    it("says so and doesn't open when the cube is already solved", () => {
        expect(player.open()).toBe(false);
        expect(player.isOpen).toBe(false);
        expect(events.messages).toHaveLength(1);
    });

    it('opens with the first move of the solution, its stage, and the move in words', () => {
        cube.move('R U');
        expect(player.open()).toBe(true);
        expect(player.isOpen).toBe(true);
        expect(document.body.classList.contains('solving')).toBe(true);
        expect($('#player').hidden).toBe(false);
        expect(events.layouts).toBe(1);

        expect($('.player-stage').textContent).toMatch(/^Stage \d of 7: /);
        expect($('.player-notation').textContent).toMatch(/^[UDFBRL]['2]?$/);
        expect($('.player-words').textContent).toMatch(/^Turn the /);
        expect($('.player-count').textContent).toMatch(/^Move 1 of \d+$/);
        expect($('.player-slider').style.getPropertyValue('--stages')).toContain('var(--stage-1)');
        expect(button('Back').disabled).toBe(true);
    });

    it('shows a given solution, skipping stages without moves', () => {
        cube.move('R U');
        player.open(SHORT_SOLUTION);
        expect($('.player-stage').textContent).toBe('Stage 3 of 7: Middle layer');
        expect($('.player-notation').textContent).toBe("U'");
        expect($('.player-count').textContent).toBe('Move 1 of 2');
    });

    it('steps forward and back, putting the moves in the history', () => {
        cube.move('R U');
        player.open(SHORT_SOLUTION);

        button('Next').click();
        expect(formatMoves(cube.history)).toBe("R U U'");
        expect($('.player-stage').textContent).toBe('Stage 5 of 7: Yellow edges');
        expect(events.changes).toBe(1);

        button('Back').click();
        expect(formatMoves(cube.history)).toBe('R U');
        expect(events.changes).toBe(2);
    });

    it("ends the user's own solve with its first move, so the app's moves are never celebrated as theirs", () => {
        cube.scramble();
        player.open();
        expect(cube.currentSolve).not.toBeNull();
        button('Next').click();
        expect(cube.currentSolve).toBeNull();
    });

    it('steps with the arrow keys, plays with Space, and closes with Escape', () => {
        cube.move('R U');
        player.open(SHORT_SOLUTION);

        expect(key('ArrowRight')).toBe(true);
        expect(cube.history).toHaveLength(3);
        expect(key('ArrowLeft')).toBe(true);
        expect(cube.history).toHaveLength(2);
        expect(key(' ')).toBe(true);
        expect(button('Pause')).toBeDefined();
        expect(key('x')).toBe(false);
        expect(key('Escape')).toBe(true);
        expect(player.isOpen).toBe(false);
        expect(events.closes).toBe(1);
    });

    it('plays to the end with a pause between moves, then celebrates once and shows that it is solved', () => {
        cube.move('R U');
        player.open(SHORT_SOLUTION);
        run(0.5); // Lets R U land
        button('Play').click();

        run(0.1);
        expect(cube.history).toHaveLength(3);
        run(0.3);
        expect(cube.history).toHaveLength(3); // Still pausing after the first turn
        run(1);
        expect(cube.isSolved).toBe(true);
        expect(events.finished).toEqual([2]);
        expect($('.player-notation').textContent).toBe('Solved!');
        expect(button('Play').disabled).toBe(true);
        expect(button('Next').disabled).toBe(true);

        run(1);
        expect(events.finished).toEqual([2]);
    });

    it('pauses with the Pause button', () => {
        cube.move('R U');
        player.open(SHORT_SOLUTION);
        run(0.5);
        button('Play').click();
        run(0.1);
        button('Pause').click();
        run(2);
        expect(cube.history).toHaveLength(3);
    });

    it('jumps anywhere with the slider, quickly, and back to the start with Restart', () => {
        cube.move('R U F D');
        player.open();
        run(0.9); // Lets R U F D land
        const total = Number($('.player-slider').max);

        const slider = $('.player-slider');
        slider.value = String(total);
        slider.dispatchEvent(new Event('input'));
        expect(cube.isSolved).toBe(true);
        run(1.1); // Even a long jump plays within about a second
        expect(cube.animator.isBusy).toBe(false);
        expect(readFacelets(cube.model)).toBe(cube.state.toString());

        button('Restart').click();
        expect(cube.history).toHaveLength(4);
        expect(events.finished).toHaveLength(1);
    });

    it('makes the face about to turn glow once the last turn has landed', () => {
        cube.move('R U');
        player.open(SHORT_SOLUTION);
        run(0.5);
        const glowing = cube.model.cubelets.filter(cubelet =>
            cubelet.userData.stickers.some(sticker => sticker.material.emissive.getHex() !== 0)
        );
        expect(glowing).toHaveLength(9);
        expect(glowing.every(cubelet => cubelet.position.y === 1)).toBe(true); // U is next

        player.close();
        cube.model.forEachSticker(material => expect(material.emissive.getHex()).toBe(0));
    });

    it('auto-solves faster and faster with the camera circling, then celebrates and closes', () => {
        cube.move("R U F' D2 L B'");
        player.open();
        const total = Number($('.player-slider').max);
        button('Auto-solve').click();
        expect(button('Next').disabled).toBe(true);

        run(FRAME_SECONDS);
        const firstTurn = turnDuration();
        expect(controls.autoRotate).toBe(true);
        const firstSpeed = controls.autoRotateSpeed;

        run(3);
        expect(turnDuration()).toBeLessThan(firstTurn);
        expect(controls.autoRotateSpeed).toBeGreaterThan(firstSpeed);

        run(20);
        expect(cube.isSolved).toBe(true);
        expect(events.finished).toEqual([total]);
        expect(player.isOpen).toBe(false);
        expect(controls.autoRotate).toBe(false);
    });

    it('auto-solves at a steady pace without circling when the system asks for less motion', () => {
        reduceMotion = true;
        cube.move('R U');
        player.open(SHORT_SOLUTION);
        run(0.5);
        button('Auto-solve').click();
        run(FRAME_SECONDS);
        expect(controls.autoRotate).toBe(false);
        expect(turnDuration()).toBe(0.3);
        run(0.31);
        expect(turnDuration()).toBe(0.3);
    });

    it('stops the circling camera when closed in the middle of an auto-solve', () => {
        cube.move("R U F' D2 L B'");
        player.open();
        button('Auto-solve').click();
        run(0.5);
        expect(player.isAutoSolving).toBe(true);
        button('Close').click();
        expect(controls.autoRotate).toBe(false);
        expect(player.isOpen).toBe(false);
    });

    it('does nothing when asked to play or auto-solve with no moves left', () => {
        cube.move('R U');
        player.open(SHORT_SOLUTION);
        key('ArrowRight');
        key('ArrowRight');
        key('ArrowRight'); // Nothing left to do
        expect(cube.isSolved).toBe(true);
        key(' ');
        expect(button('Play')).toBeDefined();
        button('Auto-solve').disabled = false;
        button('Auto-solve').click();
        expect(player.isAutoSolving).toBe(false);
        key('ArrowLeft');
        key('ArrowLeft');
        key('ArrowLeft'); // Already at the start
        expect(cube.history).toHaveLength(2);
    });

    it('shares the cube as it was when the solution started, with the solution', () => {
        cube.move('R U');
        player.open(SHORT_SOLUTION);
        button('Next').click();
        button('Share').click();
        expect(events.shared).toHaveLength(1);
        expect(formatMoves(events.shared[0].snapshot.history)).toBe('R U');
        expect(events.shared[0].solution).toBe(SHORT_SOLUTION);
    });

    it('does nothing in the render loop while closed', () => {
        const update = vi.spyOn(cube.model, 'highlightFace');
        run(0.1);
        expect(update).not.toHaveBeenCalled();
    });
});
