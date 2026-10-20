// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the editor builds real HTML elements.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEditor, PROBLEM_GLOW } from '../../src/ui/editor.js';
import CubeDraft from '../../src/cube/CubeDraft.js';
import Cube from '../../src/cube/Cube.js';
import CubeState, { SOLVED } from '../../src/cube/CubeState.js';
import { parseMoves } from '../../src/cube/notation.js';
import { CORNER_FACELETS } from '../../src/cube/pieces.js';
import { readFacelets } from '../helpers/readFacelets.js';

const FACE_COLOR = { U: 'red', R: 'green', F: 'white', D: 'orange', L: 'blue', B: 'yellow' };
const FRONT_FACE = [18, 19, 20, 21, 23, 24, 25, 26];
const A_REAL_CUBE = new CubeState().applyMoves(parseMoves("R U2 F' L D B2 R' U")).facelets;

let cube;
let canvas;
let controls;
let editor;
let flights;
let layoutChanges;
let closes;

beforeEach(() => {
    document.body.innerHTML = '<div id="editor" hidden></div>';
    document.body.className = '';

    cube = new Cube();
    canvas = new EventTarget();
    Object.assign(canvas, { style: {}, setPointerCapture: vi.fn() });
    controls = { enabled: true };
    flights = [];
    layoutChanges = 0;
    closes = 0;

    editor = createEditor({
        cube,
        // Stands in for the real picker: each test event says which sticker it is over, if any
        picker: { pick: event => (event.sticker === undefined ? null : { faceletIndex: event.sticker }) },
        canvas,
        controls,
        cameraGuide: { flyTo: direction => flights.push(direction) },
        onLayoutChange: () => layoutChanges++,
        onClose: () => closes++
    });
});

function pointer(type, sticker, { pointerId = 1, pointerType = 'mouse' } = {}) {
    const event = new Event(type);
    Object.assign(event, { sticker, pointerId, pointerType });
    canvas.dispatchEvent(event);
}

// Taps one sticker with the selected color
function tap(sticker) {
    pointer('pointerdown', sticker);
    pointer('pointerup', sticker);
}

function button(label) {
    return [...document.querySelectorAll('#editor button')].find(candidate => candidate.textContent === label);
}

function swatch(face) {
    return document.querySelector(`#editor .swatch[title="${FACE_COLOR[face]}"]`);
}

function chooseColor(face) {
    swatch(face).click();
}

function status() {
    return document.querySelector('.editor-status');
}

function stickers() {
    return readFacelets(cube.model);
}

// Paints every non-center sticker to match `facelets`, one color at a time
function paintAll(facelets) {
    for (const face of Object.keys(FACE_COLOR)) {
        chooseColor(face);
        facelets.forEach((sticker, index) => {
            if (sticker === face && index % 9 !== 4) {
                tap(index);
            }
        });
    }
}

function glowingStickers(glow) {
    const found = [];
    cube.model.forEachSticker((material, index) => {
        if (material.emissive.getHex() === glow) {
            found.push(index);
        }
    });
    return found.sort((a, b) => a - b);
}

describe('opening and closing', () => {
    it('opens with only the centers painted, hiding the normal controls', () => {
        editor.open();

        expect(editor.isOpen).toBe(true);
        expect(document.body.classList.contains('editing')).toBe(true);
        expect(document.querySelector('#editor').hidden).toBe(false);
        expect(stickers().replace(/\?/g, '')).toBe('URFDLB');
        expect(status().textContent).toBe('48 stickers left to paint.');
        expect(button('Done').disabled).toBe(true);
    });

    it('starts on the front face, with the camera turned to it, the face glowing, and its instruction shown', () => {
        editor.open();
        expect(flights).toEqual([[0.25, 0.35, 1]]);
        expect(document.querySelector('.editor-instruction').textContent).toContain('red center on top and the white center facing you');
        expect(button('Front').classList.contains('current')).toBe(true);
        expect(glowingStickers(0x444444)).toEqual([18, 19, 20, 21, 22, 23, 24, 25, 26]);
    });

    it('stops any turn that is still animating when it opens', () => {
        cube.move('R U');
        editor.open();
        expect(cube.animator.currentTurn).toBeNull();
        expect(cube.animator.turnQueue).toHaveLength(0);
    });

    it('closes without changing the cube, and shows the cube as it was', () => {
        cube.move("R U F'");
        const before = cube.state.toString();
        editor.open();
        tap(0);
        button('Close').click();

        expect(editor.isOpen).toBe(false);
        expect(document.body.classList.contains('editing')).toBe(false);
        expect(document.querySelector('#editor').hidden).toBe(true);
        expect(cube.state.toString()).toBe(before);
        expect(stickers()).toBe(before);
        expect(cube.history).toHaveLength(3);
        expect(glowingStickers(0x444444)).toEqual([]);
        expect(closes).toBe(1);
    });

    it('can be closed from outside, e.g. with Escape', () => {
        editor.open();
        editor.close();
        expect(editor.isOpen).toBe(false);
        expect(closes).toBe(1);
    });

    it('keeps the painted stickers after closing, and continues on the same face when reopened', () => {
        editor.open();
        button('Right').click();
        tap(9);
        button('Close').click();

        editor.open();
        expect(stickers()[9]).toBe('F');
        expect(button('Right').classList.contains('current')).toBe(true);
        expect(flights.at(-1)).toEqual([1, 0.35, -0.25]);
    });

    it('asks for the camera to refit when it opens, changes face, and closes', () => {
        editor.open();
        button('Right').click();
        button('Close').click();
        expect(layoutChanges).toBe(3);
    });

    it('lets go of the camera if it closes in the middle of a stroke', () => {
        editor.open();
        pointer('pointerdown', 0);
        expect(controls.enabled).toBe(false);
        editor.close();
        expect(controls.enabled).toBe(true);
    });
});

describe('painting', () => {
    beforeEach(() => editor.open());

    it('paints a tapped sticker with the selected color and updates the count', () => {
        chooseColor('U');
        tap(0);

        expect(stickers()[0]).toBe('U');
        expect(swatch('U').querySelector('.swatch-count').textContent).toBe('2/9');
        expect(status().textContent).toBe('47 stickers left to paint.');
    });

    it('starts with white selected, and shows which color is selected', () => {
        expect(swatch('F').classList.contains('selected')).toBe(true);
        chooseColor('B');
        expect(swatch('F').classList.contains('selected')).toBe(false);
        expect(swatch('B').classList.contains('selected')).toBe(true);
    });

    it('clears a sticker when it is tapped again with the same color', () => {
        tap(0);
        tap(0);
        expect(stickers()[0]).toBe('?');
    });

    it('repaints a sticker tapped with a different color', () => {
        tap(0);
        chooseColor('U');
        tap(0);
        expect(stickers()[0]).toBe('U');
    });

    it('paints every sticker the pointer passes over during one stroke, without orbiting the camera', () => {
        chooseColor('U');
        pointer('pointerdown', 0);
        expect(controls.enabled).toBe(false);
        expect(canvas.setPointerCapture).toHaveBeenCalledWith(1);
        pointer('pointermove', 1);
        pointer('pointermove', undefined); // Passing over the background in between
        pointer('pointermove', 2);
        pointer('pointerup', 2);

        expect(stickers().slice(0, 3)).toBe('UUU');
        expect(controls.enabled).toBe(true);
    });

    it('erases only stickers of the selected color during an erasing stroke', () => {
        chooseColor('U');
        [0, 1, 2].forEach(tap);
        chooseColor('F');
        tap(3);
        chooseColor('U');

        // Starts on a red sticker with red selected, so this stroke erases red, and leaves white alone
        pointer('pointerdown', 0);
        pointer('pointermove', 3);
        pointer('pointermove', 1);
        pointer('pointerup', 1);

        expect(stickers().slice(0, 4)).toBe('??UF');
    });

    it('never paints a center, and lets presses on centers or the background orbit the camera', () => {
        chooseColor('U');
        pointer('pointerdown', 22);
        expect(controls.enabled).toBe(true);
        expect(stickers()[22]).toBe('F');

        pointer('pointerdown', undefined);
        expect(controls.enabled).toBe(true);
    });

    it('ignores a second finger while painting, and moves and lifts of other pointers', () => {
        chooseColor('U');
        pointer('pointerdown', 0, { pointerId: 1 });
        pointer('pointerdown', 5, { pointerId: 2 });
        pointer('pointermove', 6, { pointerId: 2 });
        pointer('pointerup', 6, { pointerId: 2 });

        expect(stickers().slice(5, 7)).toBe('??');
        expect(controls.enabled).toBe(false); // Still painting with the first finger

        pointer('pointerup', 0, { pointerId: 1 });
        expect(controls.enabled).toBe(true);
    });

    it('shows a pointing hand over paintable stickers with a mouse, but not over centers or the background', () => {
        pointer('pointermove', 0);
        expect(canvas.style.cursor).toBe('pointer');
        pointer('pointermove', 22);
        expect(canvas.style.cursor).toBe('');
        pointer('pointermove', 0);
        pointer('pointermove', undefined);
        expect(canvas.style.cursor).toBe('');
    });

    it('leaves the cursor alone for touch', () => {
        pointer('pointermove', 0, { pointerType: 'touch' });
        expect(canvas.style.cursor).toBeUndefined();
    });

    it('does nothing while closed', () => {
        editor.close();
        pointer('pointerdown', 0);
        pointer('pointermove', 1);
        expect(controls.enabled).toBe(true);
        expect(canvas.style.cursor).toBe('');
        expect(stickers()).toBe(SOLVED);
    });
});

describe('faces', () => {
    beforeEach(() => editor.open());

    it('moves between faces with the tabs, turning the camera and showing each instruction', () => {
        button('Top').click();
        expect(button('Top').classList.contains('current')).toBe(true);
        expect(button('Front').classList.contains('current')).toBe(false);
        expect(flights.at(-1)).toEqual([0.25, 1, 0.35]);
        expect(document.querySelector('.editor-instruction').textContent).toContain('tip the top towards you');
        expect(glowingStickers(0x444444)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('marks a face as complete once all its stickers are painted', () => {
        FRONT_FACE.slice(0, 7).forEach(tap);
        expect(button('Front').classList.contains('complete')).toBe(false);
        tap(FRONT_FACE[7]);
        expect(button('Front').classList.contains('complete')).toBe(true);
        expect(button('Right').classList.contains('complete')).toBe(false);
    });
});

describe('checking and loading the cube', () => {
    beforeEach(() => editor.open());

    it('accepts a correctly copied cube and loads it on Done', () => {
        paintAll(A_REAL_CUBE);

        expect(status().textContent).toBe('This cube can be solved. Press Done to use it.');
        expect(status().classList.contains('ok')).toBe(true);
        expect(button('Done').disabled).toBe(false);

        button('Done').click();
        expect(editor.isOpen).toBe(false);
        expect(closes).toBe(1);
        expect(cube.state.toString()).toBe(A_REAL_CUBE.join(''));
        expect(stickers()).toBe(A_REAL_CUBE.join(''));
    });

    it('shows the loaded cube again when reopened, ready for corrections', () => {
        paintAll(A_REAL_CUBE);
        button('Done').click();
        editor.open();
        expect(stickers()).toBe(A_REAL_CUBE.join(''));
    });

    it('warns about too many stickers of a color while painting', () => {
        FRONT_FACE.forEach(tap);
        tap(0);
        expect(status().textContent).toBe('39 stickers left to paint. Too many white stickers: 10 instead of 9.');
        expect(status().classList.contains('problem')).toBe(true);
        expect(swatch('F').querySelector('.swatch-count').classList.contains('over')).toBe(true);
    });

    it('explains a mistake, makes the stickers involved glow red, and keeps Done disabled', () => {
        // A solved cube with two stickers of one corner swapped: a mirror-image corner
        const [a, b] = CORNER_FACELETS[0];
        const wrong = [...SOLVED];
        [wrong[a], wrong[b]] = [wrong[b], wrong[a]];
        paintAll(wrong);

        expect(status().textContent).toContain('mirrored order');
        expect(status().classList.contains('problem')).toBe(true);
        expect(button('Done').disabled).toBe(true);
        expect(glowingStickers(PROBLEM_GLOW)).toEqual([...CORNER_FACELETS[0]].sort((x, y) => x - y));
    });
});

describe('clearing', () => {
    let confirm;

    beforeEach(() => {
        // The simulated page has no confirm dialog, so this stands in for it; it answers yes unless told otherwise
        confirm = vi.fn(() => true);
        window.confirm = confirm;
        editor.open();
    });

    it('clears everything after asking', () => {
        tap(0);
        button('Clear').click();

        expect(confirm).toHaveBeenCalledOnce();
        expect(stickers()[0]).toBe('?');
        expect(status().textContent).toBe('48 stickers left to paint.');
    });

    it('keeps everything if the user says no', () => {
        confirm.mockReturnValue(false);
        tap(0);
        button('Clear').click();
        expect(stickers()[0]).toBe('F');
    });

    it("doesn't ask when there is nothing to clear", () => {
        button('Clear').click();
        expect(confirm).not.toHaveBeenCalled();
    });
});

describe('the editor with a remembered draft', () => {
    it('starts from a saved draft and reports every change, so it can be remembered', () => {
        document.body.innerHTML = '<div id="editor" hidden></div>';
        const saved = new CubeDraft();
        saved.paint(0, 'F');
        const changes = [];

        const remembering = createEditor({
            cube: new Cube(),
            picker: { pick: event => (event.sticker === undefined ? null : { faceletIndex: event.sticker }) },
            canvas,
            controls,
            cameraGuide: { flyTo: () => {} },
            onLayoutChange: () => {},
            onClose: () => {},
            savedDraft: saved.toString(),
            onDraftChange: text => changes.push(text)
        });
        remembering.open();
        expect(changes.at(-1)).toBe(saved.toString());

        tap(1); // Paints with the selected color, white (F)
        expect(changes.at(-1)[1]).toBe('F');
    });

    it('ignores a damaged saved draft', () => {
        document.body.innerHTML = '<div id="editor" hidden></div>';
        const changes = [];
        const fresh = createEditor({
            cube: new Cube(),
            picker: { pick: () => null },
            canvas: new EventTarget(),
            controls,
            cameraGuide: { flyTo: () => {} },
            onLayoutChange: () => {},
            onClose: () => {},
            savedDraft: 'not a draft',
            onDraftChange: text => changes.push(text)
        });
        fresh.open();
        expect(changes.at(-1)).toBe(new CubeDraft().toString());
    });
});
