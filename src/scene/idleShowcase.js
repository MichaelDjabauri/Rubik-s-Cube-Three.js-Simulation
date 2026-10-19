const IDLE_SECONDS = 15;
const EASE_IN_SECONDS = 2;
// OrbitControls' autoRotateSpeed: 1 is one full circle per minute
const SHOWCASE_SPEED = 1.5;

const INPUT_EVENTS = ['pointerdown', 'pointermove', 'wheel', 'keydown'];

// After a while without any input, the camera slowly circles the cube like a product on display,
// using OrbitControls' built-in auto-rotate. Any input stops it at once and starts the wait over.
//
// canRun: returns false while the showcase shouldn't happen, e.g. while the editor is open.
// target: where to listen for input, normally the window.
export function createIdleShowcase({ controls, canRun, target = window }) {
    let idleSeconds = 0;

    function wakeUp() {
        idleSeconds = 0;
        controls.autoRotate = false;
    }

    for (const type of INPUT_EVENTS) {
        target.addEventListener(type, wakeUp, { passive: true });
    }

    return {
        // Called every frame from the render loop with the seconds since the last frame
        update(deltaSeconds) {
            if (!canRun()) {
                wakeUp();
                return;
            }
            idleSeconds += deltaSeconds;

            // Ease in: the speed builds up over a couple of seconds instead of starting with a jolt
            const showingFor = idleSeconds - IDLE_SECONDS;
            controls.autoRotate = showingFor > 0;
            controls.autoRotateSpeed = SHOWCASE_SPEED * Math.min(Math.max(showingFor / EASE_IN_SECONDS, 0), 1);
        }
    };
}
