import { PATTERNS, findPattern } from '../cube/patterns.js';
import CubeState, { faceletLocation } from '../cube/CubeState.js';
import { formatMoves, parseMoves } from '../cube/notation.js';
import { FACES } from '../cube/faces.js';
import { REPEAT_PRESETS, readSequence } from './repeatShow.js';

// The pause after each move of a pattern, so every move can be followed in the history strip
const PATTERN_PAUSE_S = 0.1;
// Finishing a pattern in a hurry, e.g. when the user makes a move while it plays
const FAST_TURN_DURATION_S = 0.08;

const SVG = 'http://www.w3.org/2000/svg';

// The gallery: famous patterns to play (see patterns.js), and "How many repeats?" (see repeatShow.js).
// A dimmed overlay like the help, built into the empty #gallery element in index.html. It opens from the
// grid button in the corner (#gallery-button) or the P key, and closes with its Close button, Escape
// (see keyboard.js), or a click on the dimmed background.
//
// A pattern always starts from a solved cube, so if the cube has progress the gallery asks first.
// Its moves then play one at a time, at a pace that can be followed, so the history strip fills up
// move by move. They go into the history like a scramble's, so Undo, Reset and Solve all work on a pattern.
//   onChange     called after each move of a pattern, e.g. to refresh the buttons and the strip
//   beforePlay   called right before a pattern or a repeat show starts, e.g. to stop a celebration
//   onRepeat     called with the parsed moves to repeat (the gallery closes first)
//   confirm      asks a yes or no question, normally the browser's own
export function createGallery({ cube, onChange, beforePlay, onRepeat, confirm = text => window.confirm(text) }) {
    const overlay = document.querySelector('#gallery');
    const openButton = document.querySelector('#gallery-button');
    let playing = null; // The pattern being played: { moves, next }, where next is the index of the next move
    let waitLeft = 0;   // Seconds until its next move

    const panel = buildPanel();

    openButton.addEventListener('click', () => {
        openButton.blur();
        open();
    });
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            close();
        }
    });

    function open() {
        panel.error.textContent = '';
        overlay.hidden = false;
        panel.firstPattern.focus(); // So keyboard users can pick one right away
    }

    function close() {
        overlay.hidden = true;
    }

    function playPattern(pattern) {
        if (hasOwnProgress() && !confirm(`Play ${pattern.name}? It replaces the cube you have now.`)) {
            return;
        }
        close();
        beforePlay();
        cube.startPattern(pattern.id);
        playing = { moves: pattern.moves, next: 0 };
        waitLeft = 0;
        onChange();
    }

    // Whether starting a pattern would lose anything. A pattern on its own, or part of one, is nothing
    // to lose, so one pattern can follow another without asking.
    function hasOwnProgress() {
        const pattern = findPattern(cube.lastPattern);
        const isJustThePattern = pattern !== null
            && formatMoves(cube.history) === formatMoves(pattern.moves.slice(0, cube.history.length));
        return cube.hasProgress && !isJustThePattern;
    }

    // Called every frame from the render loop: makes the pattern's next move once the last one has landed
    function update(deltaSeconds) {
        if (!playing || cube.animator.isBusy) {
            return;
        }
        waitLeft -= deltaSeconds;
        if (waitLeft > 0) {
            return;
        }
        cube.playPatternMove(playing.moves[playing.next]);
        playing.next++;
        waitLeft = PATTERN_PAUSE_S;
        if (playing.next === playing.moves.length) {
            completePattern();
        }
        onChange();
    }

    // Makes the rest of the pattern's moves straight away, with quick turns. Called before anything else
    // happens to the cube, e.g. the user's own move, so the pattern is never left half done.
    function finishPattern() {
        if (!playing) {
            return;
        }
        for (const move of playing.moves.slice(playing.next)) {
            cube.playPatternMove(move, FAST_TURN_DURATION_S);
        }
        completePattern();
        onChange();
    }

    // Once the pattern is complete, solving it back by hand counts as a solve, as after a scramble
    function completePattern() {
        playing = null;
        cube.beginSolve();
    }

    // Drops the rest of the pattern, e.g. when a shared link replaces the cube
    function cancelPattern() {
        playing = null;
    }

    function startRepeats(moves) {
        close();
        finishPattern();
        beforePlay();
        onRepeat(moves);
    }

    // Builds the panel into #gallery: a card per pattern, then "How many repeats?" with a button per
    // preset and a field for any sequence, then Close
    function buildPanel() {
        const cards = PATTERNS.map(pattern => {
            const card = button('', () => playPattern(pattern), 'pattern-card');
            card.title = pattern.notation;
            card.append(
                cubePicture(new CubeState().applyMoves(pattern.moves).facelets),
                element('strong', 'pattern-name', pattern.name),
                element('span', 'pattern-about', pattern.about),
                element('span', 'pattern-length', `${pattern.moves.length} moves`)
            );
            return card;
        });

        const presets = REPEAT_PRESETS.map(preset => button(preset, () => startRepeats(parseMoves(preset)), 'repeat-preset'));

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = "Or type your own, like F R'";
        input.setAttribute('aria-label', 'Your own sequence of moves');
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.setAttribute('autocapitalize', 'characters');
        const error = element('p', 'repeat-error', '');
        error.setAttribute('role', 'alert');

        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'primary';
        submit.textContent = 'Repeat';

        const form = document.createElement('form');
        form.className = 'repeat-form';
        form.append(input, submit);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const { moves, error: problem } = readSequence(input.value);
            if (problem) {
                error.textContent = problem;
                return;
            }
            error.textContent = '';
            input.blur();
            startRepeats(moves);
        });

        const title = element('h2', '', 'Patterns');
        title.id = 'gallery-title';
        const dialog = element('div', 'gallery-panel', '', [
            title,
            element('p', '', 'Famous patterns, played one move at a time from a solved cube. Watch the moves fill the strip at the bottom.'),
            element('div', 'pattern-list', '', cards),
            element('h2', '', 'How many repeats?'),
            element('p', '', 'Repeat any sequence of moves and the cube always comes back to where it started, sooner or later. Pick one, guess how many repeats it takes, and count along.'),
            element('div', 'repeat-presets', '', presets),
            form,
            error,
            button('Close', close, 'gallery-close')
        ]);
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'gallery-title');
        overlay.append(dialog);

        return { firstPattern: cards[0], error };
    }

    return {
        open,
        close,
        update,
        finishPattern,
        cancelPattern,
        get isOpen() {
            return !overlay.hidden;
        },
        get isPlayingPattern() {
            return playing !== null;
        }
    };
}

// A small picture of the cube as it looks from the front, right and above (the app's starting view),
// drawn flat: the top (U), front (F) and right (R) faces, each a dark square with its 9 stickers.
// facelets: the cube's 54 stickers in CubeState's layout.
export function cubePicture(facelets) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '-2.25 -2.6 4.5 5.2');
    svg.setAttribute('class', 'pattern-picture');
    svg.setAttribute('aria-hidden', 'true');

    // The U, R and F faces start at these sticker numbers
    for (const start of [0, 9, 18]) {
        const { normal } = faceletLocation(start);
        svg.append(polygon(square(normal.map(n => n * 1.5), normal, 1.5), 'pattern-body'));
        for (let index = start; index < start + 9; index++) {
            const { position } = faceletLocation(index);
            const sticker = polygon(square(position.map((p, axis) => p + normal[axis] / 2), normal, 0.42));
            sticker.setAttribute('fill', FACES.find(candidate => candidate.notation === facelets[index]).hex);
            svg.append(sticker);
        }
    }
    return svg;
}

// The 4 corners, on screen, of a square on the cube's surface: its center, the direction it faces,
// and half its width
function square(center, normal, half) {
    const [a, b] = [0, 1, 2].filter(axis => normal[axis] === 0);
    return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([alongA, alongB]) => {
        const point = [...center];
        point[a] += alongA * half;
        point[b] += alongB * half;
        return project(point);
    });
}

// Where a point [x, y, z] of the cube lands in the picture, looking from the front, right and above:
// x runs down to the right, z down to the left, and y straight up
function project([x, y, z]) {
    return [(x - z) / Math.SQRT2, (x + z - 2 * y) / Math.sqrt(6)];
}

function polygon(points, className) {
    const node = document.createElementNS(SVG, 'polygon');
    node.setAttribute('points', points.map(point => point.map(n => n.toFixed(3)).join(',')).join(' '));
    if (className) {
        node.setAttribute('class', className);
    }
    return node;
}

function element(tag, className, text, children = []) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    node.append(...children);
    return node;
}

// A button that takes its focus away after a click, so pressing Space or Enter later doesn't click it again
function button(label, onClick, className = '') {
    const node = document.createElement('button');
    node.className = className;
    node.textContent = label;
    node.addEventListener('click', () => {
        node.blur();
        onClick();
    });
    return node;
}
