// The Scramble, Undo, Redo and Reset buttons at the bottom of the screen, and the scramble
// text at the top (all defined in index.html).
// Each button sends a command like { type: 'undo' } to onCommand when clicked.
export function createToolbar(onCommand) {
    const buttons = {
        scramble: document.querySelector('#scramble'),
        undo: document.querySelector('#undo'),
        redo: document.querySelector('#redo'),
        reset: document.querySelector('#reset')
    };
    const scrambleText = document.querySelector('#scramble-text');

    for (const [type, button] of Object.entries(buttons)) {
        button.addEventListener('click', () => {
            // Take focus off the button, so pressing Space or Enter later doesn't click it again
            button.blur();
            onCommand({ type });
        });
    }

    return {
        // Greys out the buttons that have nothing to do, and shows the latest scramble
        update(cube) {
            buttons.undo.disabled = !cube.canUndo;
            buttons.redo.disabled = !cube.canRedo;
            buttons.reset.disabled = !cube.canUndo;

            scrambleText.textContent = cube.lastScramble ? `Scramble: ${cube.lastScramble}` : '';
        }
    };
}
