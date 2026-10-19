// @vitest-environment happy-dom
// A smoke test: starts the whole app in a simulated web page and uses it like a person would,
// to catch wiring mistakes in main.js. The simulated page can't draw 3D graphics, so a stand-in
// replaces Three.js's WebGL renderer; everything else is the real app.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('three', async (importOriginal) => {
    const three = await importOriginal();

    class FakeRenderer {
        constructor({ canvas }) {
            this.domElement = canvas;
            this.renderCount = 0;
            this.shadowMap = {};
            FakeRenderer.latest = this;
        }
        setPixelRatio() {}
        setSize() {}
        setAnimationLoop(callback) {
            this.animationLoop = callback;
        }
        render(scene, camera) {
            this.renderCount++;
            this.scene = scene; // So tests can see what is drawn
            this.camera = camera; // and where the camera is
        }
    }

    // Makes the studio reflections; the real one needs WebGL
    class FakePMREMGenerator {
        fromScene() {
            return { texture: new three.Texture() };
        }
        dispose() {}
    }

    return { ...three, WebGLRenderer: FakeRenderer, PMREMGenerator: FakePMREMGenerator };
});

// The real page body from index.html, minus the script tag; the test starts the app itself
const BODY = readFileSync('index.html', 'utf8')
    .match(/<body>([\s\S]*)<\/body>/)[1]
    .replace(/<script[\s\S]*?<\/script>/, '');

let renderer;
let clock; // The animation clock in milliseconds, which in a browser runs on the same clock as performance.now()

// Starts a fresh copy of the app on a screen of the given size
async function startApp({ width = 1024, height = 768 } = {}) {
    window.happyDOM.setViewport({ width, height });
    window.localStorage.clear(); // Every test is someone's first visit
    document.body.innerHTML = BODY;
    document.body.className = '';
    delete document.documentElement.dataset.theme;
    vi.resetModules();
    clock = performance.now();
    await import('../src/main.js');
    renderer = (await import('three')).WebGLRenderer.latest;
}

beforeEach(() => startApp());

function $(selector) {
    return document.querySelector(selector);
}

function pressKey(key, fields = {}) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...fields }));
}

function doubleClick() {
    const canvas = $('#c');
    for (let i = 0; i < 2; i++) {
        canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 5, clientY: 5, pointerId: 1 }));
        canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: 5, clientY: 5, pointerId: 1 }));
    }
}

// Runs the render loop for a while, like the browser would, with time moving steadily forwards
function runFrames(seconds) {
    const end = clock + seconds * 1000;
    while (clock < end) {
        clock += 16;
        renderer.animationLoop(clock);
    }
}

describe('the app', () => {
    it('starts, and draws a frame on every screen refresh', () => {
        expect(renderer.domElement).toBe($('#c'));
        runFrames(0.1);
        expect(renderer.renderCount).toBeGreaterThan(1);
    });

    it('starts with nothing to undo, redo or reset, and builds the 12 face buttons', () => {
        expect($('#undo').disabled).toBe(true);
        expect($('#redo').disabled).toBe(true);
        expect($('#reset').disabled).toBe(true);
        expect(document.querySelectorAll('#move-buttons button')).toHaveLength(12);
    });

    it('turns a face from the keyboard, then undoes and redoes it', () => {
        pressKey('r');
        expect($('#undo').disabled).toBe(false);

        pressKey('z', { ctrlKey: true });
        expect($('#undo').disabled).toBe(true);
        expect($('#redo').disabled).toBe(false);

        pressKey('z', { ctrlKey: true, shiftKey: true });
        expect($('#undo').disabled).toBe(false);
        runFrames(0.5);
    });

    it('turns a face from its button, and previews the face while the button is hovered', () => {
        const firstButton = $('#move-buttons button');
        firstButton.dispatchEvent(new Event('pointerenter'));
        firstButton.dispatchEvent(new Event('pointerleave'));
        firstButton.click();
        expect($('#undo').disabled).toBe(false);
    });

    it('scrambles, shows the scramble, and resets', () => {
        $('#scramble').click();
        expect($('#cube-info').textContent).toMatch(/^Scramble: ([UDFBRL]['2]? ?){25}$/);
        runFrames(1);

        $('#reset').click();
        expect($('#cube-info').textContent).toBe('');
        expect($('#reset').disabled).toBe(true);
        runFrames(2.5);
    });

    it('opens the editor, ignores face keys while it is open, and closes it with Escape', () => {
        $('#edit').click();
        expect(document.body.classList.contains('editing')).toBe(true);
        expect($('#editor').hidden).toBe(false);
        expect($('.editor-instruction').textContent).toContain('red center on top');
        runFrames(0.5); // Lets the camera swing to the front face

        pressKey('r');
        expect($('#undo').disabled).toBe(true);

        pressKey('Escape');
        expect(document.body.classList.contains('editing')).toBe(false);
        expect($('#editor').hidden).toBe(true);
    });

    it('shows Scramble and hides Solved cube at the start, and Solved cube works when clicked', () => {
        expect($('#scramble').hidden).toBe(false);
        expect($('#solved').hidden).toBe(true);
        pressKey('r');
        $('#solved').click();
        expect($('#undo').disabled).toBe(true);
        expect($('#scramble').hidden).toBe(false);
    });

    it('celebrates when a person solves the scramble from the keyboard', () => {
        $('#scramble').click();
        const scramble = $('#cube-info').textContent.replace('Scramble: ', '').split(' ');

        // Undo the scramble backwards: X' needs X, X needs Shift+X, and X2 needs X twice
        for (const move of scramble.reverse()) {
            const key = move[0].toLowerCase();
            if (move.endsWith('2')) {
                pressKey(key);
                pressKey(key);
            } else {
                pressKey(key, { shiftKey: !move.endsWith("'") });
            }
        }
        expect($('#solved-message').textContent).toBe(''); // Not until the last turn has landed

        runFrames(12);
        expect($('#solved-message strong').textContent).toBe('Solved!');
        expect($('#solved-message span').textContent).toMatch(/^in \d+ moves$/);
    });

    it('closes the editor with its Close button and refreshes the toolbar', () => {
        pressKey('r');
        $('#edit').click();
        [...document.querySelectorAll('#editor button')].find(button => button.textContent === 'Close').click();
        expect($('#editor').hidden).toBe(true);
        expect($('#undo').disabled).toBe(false);
    });

    it('handles presses and drags on the 3D view, with the editor closed and open', () => {
        const canvas = $('#c');
        const press = (type) => canvas.dispatchEvent(new PointerEvent(type, { clientX: 5, clientY: 5, pointerId: 1, bubbles: true }));

        press('pointerdown');
        press('pointermove');
        press('pointerup');

        $('#edit').click();
        press('pointerdown');
        press('pointermove');
        press('pointerup');
        runFrames(0.1);
    });

    it('copes with the window changing size', () => {
        window.dispatchEvent(new Event('resize'));
        $('#edit').click();
        window.dispatchEvent(new Event('resize'));
        runFrames(0.1);
    });

    it('starts on an upright phone, fitting the cube above the buttons', async () => {
        await startApp({ width: 390, height: 844 });
        expect(window.matchMedia('(max-width: 700px)').matches).toBe(true);
        runFrames(0.1);
        expect(renderer.renderCount).toBeGreaterThan(1);
    });

    it('sets up the studio: reflections, lights, and a floor that catches the shadow', async () => {
        const { Scene, DirectionalLight, ShadowMaterial } = await import('three');
        runFrames(0.1);
        const scene = renderer.scene;
        expect(scene).toBeInstanceOf(Scene);
        expect(scene.environment).not.toBeNull();
        expect(scene.children.some(child => child instanceof DirectionalLight && child.castShadow)).toBe(true);
        expect(scene.children.some(child => child.material instanceof ShadowMaterial)).toBe(true);
        expect(renderer.shadowMap.enabled).toBe(true);
    });

    it('switches between the dark and light theme with the theme button, and remembers the pick', () => {
        const root = document.documentElement;
        const system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        const other = system === 'light' ? 'dark' : 'light';
        expect(root.dataset.theme).toBe(system);

        $('#theme-button').click();
        expect(root.dataset.theme).toBe(other);
        expect(window.localStorage.getItem('rubiks-cube.theme')).toBe(other);

        $('#theme-button').click();
        expect(root.dataset.theme).toBe(system);
        expect(window.localStorage.getItem('rubiks-cube.theme')).toBeNull();
    });

    it('shows a hint on the first visit, until the first key press', () => {
        expect($('#hint').hidden).toBe(false);
        pressKey('r');
        expect($('#hint').hidden).toBe(true);
    });

    it("opens help with the ? button and the ? key, and keys don't turn the cube while it is open", () => {
        $('#help-button').click();
        expect($('#help').hidden).toBe(false);
        pressKey('r');
        expect($('#undo').disabled).toBe(true);

        pressKey('Escape');
        expect($('#help').hidden).toBe(true);

        pressKey('?', { shiftKey: true });
        expect($('#help').hidden).toBe(false);
        $('.help-close').click();
        expect($('#help').hidden).toBe(true);
    });

    it('swings the camera back to the start on a double-click', () => {
        runFrames(0.1);
        const startDirection = renderer.camera.position.clone().normalize();

        // The editor turns the camera to the front face; closing it leaves the camera there
        $('#edit').click();
        runFrames(1);
        pressKey('Escape');
        expect(renderer.camera.position.clone().normalize().distanceTo(startDirection)).toBeGreaterThan(0.1);

        doubleClick();
        runFrames(1);
        expect(renderer.camera.position.clone().normalize().distanceTo(startDirection)).toBeLessThan(1e-6);
    });

    it("doesn't move the camera on a double-click while the editor is open", () => {
        $('#edit').click();
        runFrames(1);
        const before = renderer.camera.position.clone();
        doubleClick();
        runFrames(1);
        expect(renderer.camera.position.distanceTo(before)).toBeLessThan(1e-6);
        expect($('#editor').hidden).toBe(false);
    });

    it('slowly circles the cube when left alone for a while', () => {
        runFrames(0.1);
        const start = renderer.camera.position.clone();
        runFrames(10);
        expect(renderer.camera.position.distanceTo(start)).toBeLessThan(1e-6); // Still waiting
        runFrames(10);
        expect(renderer.camera.position.distanceTo(start)).toBeGreaterThan(0.1);
    });
});
