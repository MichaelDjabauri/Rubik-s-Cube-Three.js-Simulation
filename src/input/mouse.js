import * as THREE from 'three';
import { inPlaneAxes, closestAxis, moveForDrag } from './drag.js';

// How far the pointer has to move before a drag counts as a turn
const DRAG_THRESHOLD_PX = 10;

// Lets the user grab a sticker and drag it to turn its layer, with a mouse or a finger.
// Dragging the background still orbits the camera, and two fingers pinch to zoom, even when
// the first finger landed on the cube.
//
// picker: finds the sticker under the pointer (see picking.js).
// onCommand receives { type: 'move', notation } when a drag turns a layer.
// isEnabled: turning is switched off while it returns false, e.g. while the cube editor is open.
export function setUpMouseTurns({ camera, canvas, cubeModel, picker, controls, onCommand, isEnabled = () => true }) {
    let drag = null;         // The grab in progress, if any
    let replaying = false;   // True while passing a finger over to OrbitControls

    // This listener uses the capture phase so it runs before OrbitControls' own pointerdown listener
    canvas.addEventListener('pointerdown', (event) => {
        if (replaying || !isEnabled()) {
            return; // Our own replayed event meant for OrbitControls, or turning is switched off
        }

        if (drag) {
            // Another finger landed while one is holding the cube. Before any turn, that means the
            // user wants to pinch, so hand the gesture to the camera. After a turn, ignore it.
            if (!drag.turned) {
                handOverToCamera();
            }
            return;
        }

        const sticker = picker.pick(event);
        if (!sticker) {
            return; // Not on the cube: let OrbitControls orbit the camera
        }

        controls.enabled = false;
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = 'grabbing';

        const { point, normal, cell } = sticker;
        drag = {
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            startX: event.clientX,
            startY: event.clientY,
            point,
            normal,
            cell,
            turned: false
        };
    }, { capture: true });

    canvas.addEventListener('pointermove', (event) => {
        if (!drag) {
            // Show a hand when a mouse hovers the cube, to hint that it can be grabbed
            if (event.pointerType !== 'touch' && isEnabled()) {
                canvas.style.cursor = picker.pick(event) ? 'grab' : '';
            }
            return;
        }
        if (event.pointerId !== drag.pointerId || drag.turned) {
            return; // Only the grabbing finger counts, and one drag makes one move
        }

        const dragPixels = [event.clientX - drag.startX, event.clientY - drag.startY];
        if (Math.hypot(...dragPixels) < DRAG_THRESHOLD_PX) {
            return;
        }
        drag.turned = true;

        // Compare the drag with how each direction along the grabbed face looks on screen
        const candidates = inPlaneAxes(drag.normal).map(axis => ({
            axis,
            screen: screenDirection(drag.point, axis)
        }));
        const notation = moveForDrag(drag.normal, drag.cell, closestAxis(dragPixels, candidates));

        if (notation) {
            onCommand({ type: 'move', notation });
        }
    });

    function endDrag(event) {
        if (drag && event.pointerId === drag.pointerId) {
            drag = null;
            controls.enabled = true;
            canvas.style.cursor = '';
        }
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // OrbitControls never saw the first finger go down, because we took it. Give it a copy of that
    // pointerdown now, so when the second finger's real pointerdown reaches it, it sees two fingers and pinches.
    function handOverToCamera() {
        const firstFinger = drag;
        drag = null;
        controls.enabled = true;
        canvas.style.cursor = '';

        replaying = true;
        canvas.dispatchEvent(new PointerEvent('pointerdown', {
            pointerId: firstFinger.pointerId,
            pointerType: firstFinger.pointerType,
            clientX: firstFinger.startX,
            clientY: firstFinger.startY,
            isPrimary: true,
            button: 0,
            buttons: 1,
            bubbles: true
        }));
        replaying = false;
    }

    // Which way a small step from `point` along `axis` (both in cube space) goes on screen, in pixels
    function screenDirection(point, axis) {
        const start = toScreen(point);
        const end = toScreen(point.clone().add(new THREE.Vector3(...axis).multiplyScalar(0.5)));
        return [end[0] - start[0], end[1] - start[1]];
    }

    function toScreen(point) {
        const rect = canvas.getBoundingClientRect();
        const projected = cubeModel.localToWorld(point.clone()).project(camera);
        return [(projected.x + 1) / 2 * rect.width, (1 - projected.y) / 2 * rect.height];
    }
}
