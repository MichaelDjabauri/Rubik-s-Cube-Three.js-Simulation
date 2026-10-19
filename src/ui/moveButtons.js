import { FACES } from '../cube/faces.js';

const ROW_ORDER = ['U', 'D', 'F', 'B', 'R', 'L'];

// The panel of face-turn buttons on the right side of the screen: one row per face, with a
// clockwise and a counterclockwise button, and a stripe in the face's color.
// The buttons are built here from FACES, into the empty #move-buttons element in index.html.
//
// onCommand receives { type: 'move', notation } when a button is clicked.
// onPreview receives the face letter while a button is hovered, and null when the pointer leaves.
export function createMoveButtons(onCommand, onPreview) {
    const panel = document.querySelector('#move-buttons');

    for (const notation of ROW_ORDER) {
        const face = FACES.find(candidate => candidate.notation === notation);
        const row = document.createElement('div');
        row.className = 'move-row';
        row.style.setProperty('--face-color', face.hex);

        for (const [move, direction] of [[notation, 'clockwise'], [`${notation}'`, 'counterclockwise']]) {
            const button = document.createElement('button');
            button.textContent = move;
            button.title = `${move}: turn the ${face.color} face ${direction}`;

            button.addEventListener('click', () => {
                // Take focus off the button, so pressing Space or Enter later doesn't click it again
                button.blur();
                onCommand({ type: 'move', notation: move });
            });
            button.addEventListener('pointerenter', () => onPreview(notation));
            button.addEventListener('pointerleave', () => onPreview(null));

            row.append(button);
        }

        panel.append(row);
    }
}
