import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import * as THREE from 'three';
import { setUpMouseTurns } from '../../src/input/mouse.js';
import { createStickerPicker } from '../../src/input/picking.js';
import RubiksCube from '../../src/cube/RubiksCube.js';

// These tests run mouse.js in Node, without a browser: the canvas is a plain EventTarget with the
// few extra things mouse.js uses, and pointer events are plain Events with the fields it reads.

const WIDTH = 1200;
const HEIGHT = 800;

beforeAll(() => {
    // Node has no PointerEvent; mouse.js creates one when handing a finger over to OrbitControls
    globalThis.PointerEvent ??= class extends Event {
        constructor(type, init = {}) {
            super(type, init);
            // Copy the pointer fields; Event already handles its own ones like bubbles
            for (const [key, value] of Object.entries(init)) {
                if (!(key in this)) {
                    this[key] = value;
                }
            }
        }
    };
});

let canvas;
let camera;
let controls;
let commands;
let receivedByControls;
let turningEnabled;

beforeEach(() => {
    camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 0.1, 1000);
    camera.position.set(3, 3, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    canvas = new EventTarget();
    Object.assign(canvas, {
        style: {},
        setPointerCapture() {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: WIDTH, height: HEIGHT })
    });

    controls = { enabled: true };
    turningEnabled = true;
    commands = [];
    const model = new RubiksCube();
    const picker = createStickerPicker({ camera, canvas, cubeModel: model });
    setUpMouseTurns({ camera, canvas, cubeModel: model, picker, controls, onCommand: command => commands.push(command.notation), isEnabled: () => turningEnabled });
    model.updateMatrixWorld(true);

    // Stands in for OrbitControls' own pointerdown listener, which runs after ours
    receivedByControls = [];
    canvas.addEventListener('pointerdown', event => {
        if (controls.enabled) {
            receivedByControls.push(event.pointerId);
        }
    });
});

// Where a point on the cube appears on screen, in pixels
function screenOf(x, y, z) {
    const projected = new THREE.Vector3(x, y, z).project(camera);
    return [(projected.x + 1) / 2 * WIDTH, (1 - projected.y) / 2 * HEIGHT];
}

function pointer(type, [x, y], pointerId = 1, pointerType = 'touch') {
    const event = new Event(type);
    Object.assign(event, { clientX: x, clientY: y, pointerId, pointerType });
    canvas.dispatchEvent(event);
}

// Screen position 40 pixels from `point` in the on-screen direction of `toward` (a direction in the cube)
function draggedFrom(point, toward) {
    const start = screenOf(...point);
    const end = screenOf(...point.map((value, i) => value + toward[i] * 0.4));
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    return [start[0] + (end[0] - start[0]) / length * 40, start[1] + (end[1] - start[1]) / length * 40];
}

const FRONT_TOP_ROW = [0, 1, 1.5];
const RIGHT = [1, 0, 0];

describe('mouse and touch turns', () => {
    it('turns the layer under a dragged sticker, pausing camera orbit meanwhile', () => {
        pointer('pointerdown', screenOf(...FRONT_TOP_ROW));
        expect(controls.enabled).toBe(false);

        pointer('pointermove', draggedFrom(FRONT_TOP_ROW, RIGHT));
        expect(commands).toEqual(["U'"]);

        pointer('pointerup', [0, 0]);
        expect(controls.enabled).toBe(true);
    });

    it('turns other faces as dragged, and ignores drags on center stickers', () => {
        const cases = [
            { point: [1, 0, 1.5], toward: [0, 1, 0], move: 'R' },
            { point: [0, 1.5, 1], toward: [1, 0, 0], move: 'F' },
            { point: [1.5, 1, 0], toward: [0, 0, -1], move: "U'" },
            { point: [0, 0, 1.5], toward: [1, 0, 0], move: undefined }
        ];
        for (const { point, toward, move } of cases) {
            pointer('pointerdown', screenOf(...point));
            pointer('pointermove', draggedFrom(point, toward));
            pointer('pointerup', [0, 0]);
            expect(commands.pop(), `${point} toward ${toward}`).toBe(move);
        }
    });

    it('does nothing until the pointer has moved a little', () => {
        const start = screenOf(...FRONT_TOP_ROW);
        pointer('pointerdown', start);
        pointer('pointermove', [start[0] + 4, start[1]]);
        expect(commands).toEqual([]);
    });

    it('leaves the camera alone when the background is pressed', () => {
        pointer('pointerdown', [5, 5]);
        expect(controls.enabled).toBe(true);
        expect(receivedByControls).toEqual([1]);
    });

    it('hands both fingers to the camera for pinching when a second finger lands before any turn', () => {
        pointer('pointerdown', screenOf(...FRONT_TOP_ROW), 1);
        expect(receivedByControls).toEqual([]);

        pointer('pointerdown', [100, 100], 2);

        // OrbitControls first gets a replay of finger 1, then the real finger 2
        expect(controls.enabled).toBe(true);
        expect(receivedByControls).toEqual([1, 2]);

        // Moving finger 1 no longer turns the cube
        pointer('pointermove', draggedFrom(FRONT_TOP_ROW, RIGHT), 1);
        expect(commands).toEqual([]);
    });

    it('ignores a second finger once the first has already turned a layer', () => {
        pointer('pointerdown', screenOf(...FRONT_TOP_ROW), 1);
        pointer('pointermove', draggedFrom(FRONT_TOP_ROW, RIGHT), 1);
        pointer('pointerdown', [100, 100], 2);

        expect(commands).toEqual(["U'"]);
        expect(controls.enabled).toBe(false);
        expect(receivedByControls).toEqual([]);
    });

    it('only ends the grab when the grabbing finger lifts', () => {
        pointer('pointerdown', screenOf(...FRONT_TOP_ROW), 1);
        pointer('pointermove', draggedFrom(FRONT_TOP_ROW, RIGHT), 1);
        pointer('pointerup', [100, 100], 2);
        expect(controls.enabled).toBe(false);

        pointer('pointerup', [0, 0], 1);
        expect(controls.enabled).toBe(true);
    });

    it('does nothing while turning is switched off, e.g. while the cube editor is open', () => {
        turningEnabled = false;
        pointer('pointerdown', screenOf(...FRONT_TOP_ROW));
        pointer('pointermove', draggedFrom(FRONT_TOP_ROW, RIGHT));
        expect(commands).toEqual([]);
        expect(controls.enabled).toBe(true);
    });

    it('shows a grab hand when a mouse hovers the cube, and the normal cursor elsewhere', () => {
        pointer('pointermove', screenOf(...FRONT_TOP_ROW), 1, 'mouse');
        expect(canvas.style.cursor).toBe('grab');
        pointer('pointermove', [5, 5], 1, 'mouse');
        expect(canvas.style.cursor).toBe('');
    });

    it('shows a grabbing hand while dragging, and the normal cursor afterwards', () => {
        pointer('pointerdown', screenOf(...FRONT_TOP_ROW), 1, 'mouse');
        expect(canvas.style.cursor).toBe('grabbing');
        pointer('pointerup', [0, 0], 1, 'mouse');
        expect(canvas.style.cursor).toBe('');
    });

    it('leaves the cursor alone for touch, and while turning is switched off', () => {
        pointer('pointermove', screenOf(...FRONT_TOP_ROW), 1, 'touch');
        expect(canvas.style.cursor).toBeUndefined();

        turningEnabled = false;
        pointer('pointermove', screenOf(...FRONT_TOP_ROW), 1, 'mouse');
        expect(canvas.style.cursor).toBeUndefined();
    });

    it('ignores moves from other fingers while one is grabbing', () => {
        pointer('pointerdown', screenOf(...FRONT_TOP_ROW), 1);
        pointer('pointermove', draggedFrom(FRONT_TOP_ROW, RIGHT), 2);
        expect(commands).toEqual([]);

        pointer('pointermove', draggedFrom(FRONT_TOP_ROW, RIGHT), 1);
        expect(commands).toEqual(["U'"]);
    });

    it('makes only one move per drag, however far it goes', () => {
        pointer('pointerdown', screenOf(...FRONT_TOP_ROW), 1);
        pointer('pointermove', draggedFrom(FRONT_TOP_ROW, RIGHT), 1);
        pointer('pointermove', [0, 0], 1);
        expect(commands).toEqual(["U'"]);
    });
});

describe('mouse turns with default settings', () => {
    it('is switched on unless told otherwise', () => {
        const otherCanvas = new EventTarget();
        Object.assign(otherCanvas, {
            style: {},
            setPointerCapture() {},
            getBoundingClientRect: () => ({ left: 0, top: 0, width: WIDTH, height: HEIGHT })
        });
        const model = new RubiksCube();
        const picker = createStickerPicker({ camera, canvas: otherCanvas, cubeModel: model });
        const moves = [];
        setUpMouseTurns({ camera, canvas: otherCanvas, cubeModel: model, picker, controls, onCommand: command => moves.push(command.notation) });
        model.updateMatrixWorld(true);

        for (const [type, position] of [['pointerdown', screenOf(...FRONT_TOP_ROW)], ['pointermove', draggedFrom(FRONT_TOP_ROW, RIGHT)]]) {
            const event = new Event(type);
            Object.assign(event, { clientX: position[0], clientY: position[1], pointerId: 1, pointerType: 'mouse' });
            otherCanvas.dispatchEvent(event);
        }
        expect(moves).toEqual(["U'"]);
    });
});
