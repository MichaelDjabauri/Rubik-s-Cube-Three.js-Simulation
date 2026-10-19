// How quickly the second press has to follow the first
const MAX_GAP_MS = 350;
// How far a press may move and still count as a tap rather than a drag
const MAX_MOVEMENT_PX = 10;
// How far apart the two taps may be
const MAX_DISTANCE_PX = 30;

// Calls onDoubleTap after two quick taps in about the same place on `element`: a double-click with a
// mouse, or a double-tap on a touch screen. Presses that turn into drags, and two-finger gestures
// like pinching, don't count.
// now: the current time in milliseconds; tests pass their own clock.
export function onDoubleTap(element, onDoubleTap, now = () => performance.now()) {
    const fingersDown = new Set();
    let press = null;   // Where the current press started
    let lastTap = null; // { time, x, y } of the previous tap

    element.addEventListener('pointerdown', (event) => {
        fingersDown.add(event.pointerId);
        if (fingersDown.size > 1) {
            // A second finger: a pinch or similar, not a tap
            press = null;
            lastTap = null;
            return;
        }
        press = pointOf(event);
    });

    const release = (event) => {
        fingersDown.delete(event.pointerId);
        if (!press) {
            return;
        }
        const point = pointOf(event);
        const movedFar = distance(press, point) > MAX_MOVEMENT_PX;
        press = null;
        if (movedFar) {
            lastTap = null;
            return;
        }

        const tap = { ...point, time: now() };
        if (lastTap && tap.time - lastTap.time <= MAX_GAP_MS && distance(lastTap, tap) <= MAX_DISTANCE_PX) {
            lastTap = null;
            onDoubleTap();
        } else {
            lastTap = tap;
        }
    };
    element.addEventListener('pointerup', release);

    // The browser took over the gesture (e.g. for scrolling), so this press isn't a tap
    element.addEventListener('pointercancel', (event) => {
        fingersDown.delete(event.pointerId);
        press = null;
        lastTap = null;
    });
}

function pointOf(event) {
    return { x: event.clientX, y: event.clientY };
}

function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
}
