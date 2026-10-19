// The buttons at the bottom of the screen and the line of info at the top (all defined in index.html).
// Each button sends a command like { type: 'undo' } to onCommand when clicked.
//
// The toolbar follows the cube's starting point:
//   normal:            Scramble, Undo, Redo, Reset (back to solved), Copy my cube
//   with a copied cube: Solved cube, Undo, Redo, Reset (back to the copy), Copy my cube
// Solved cube takes Scramble's place, since scrambling a copied cube isn't useful, and the
// info line says that a copied cube is loaded.
export function createToolbar(onCommand) {
    const buttons = {
        scramble: document.querySelector('#scramble'),
        solved: document.querySelector('#solved'),
        undo: document.querySelector('#undo'),
        redo: document.querySelector('#redo'),
        reset: document.querySelector('#reset'),
        edit: document.querySelector('#edit')
    };
    const info = document.querySelector('#cube-info');

    for (const [type, button] of Object.entries(buttons)) {
        button.addEventListener('click', () => {
            // Take focus off the button, so pressing Space or Enter later doesn't click it again
            button.blur();
            onCommand({ type });
        });
    }

    return {
        // Shows the buttons that fit the cube's starting point, greys out the ones with nothing to do,
        // and updates the info line
        update(cube) {
            buttons.scramble.hidden = cube.startsFromCopy;
            buttons.solved.hidden = !cube.startsFromCopy;

            buttons.undo.disabled = !cube.canUndo;
            buttons.redo.disabled = !cube.canRedo;
            buttons.reset.disabled = !cube.canUndo;
            buttons.reset.title = cube.startsFromCopy
                ? 'Rewind every move back to your copied cube'
                : 'Rewind every move back to the solved cube';

            info.textContent = infoText(cube);
        }
    };
}

function infoText(cube) {
    if (cube.startsFromCopy) {
        return 'Your copied cube. Reset goes back to it.';
    }
    return cube.lastScramble ? `Scramble: ${cube.lastScramble}` : '';
}
