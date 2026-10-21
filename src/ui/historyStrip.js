import { formatMove } from '../cube/notation.js';

// The move history strip (#history-strip in index.html): a row of small chips, one per move made since
// the last reset, written in notation, with the latest move highlighted. Moves that can be redone follow,
// dimmed. Tapping a chip travels to just after that move, like a video's timeline, and Start goes back
// to the beginning. The strip scrolls sideways and keeps the highlighted chip in view.
//
// onCommand receives { type: 'travel', to } when a chip is tapped, where `to` is how many moves to keep.
export function createHistoryStrip(onCommand) {
    const strip = document.querySelector('#history-strip');
    const start = chip('Start', 0);
    start.classList.add('start');
    start.title = 'Back to the start';
    strip.append(start);
    const chips = []; // One per move: the history, then the moves to redo in the order they'd be redone

    // A mouse wheel scrolls up and down, but the strip only scrolls sideways
    strip.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            event.preventDefault();
            strip.scrollLeft += event.deltaY;
        }
    }, { passive: false });

    // A chip that travels to just after the move it shows: `to` is how many moves to keep
    function chip(text, to) {
        const node = document.createElement('button');
        node.className = 'chip';
        node.textContent = text;
        node.title = `Move ${to}`;
        node.addEventListener('click', () => {
            node.blur();
            onCommand({ type: 'travel', to });
        });
        return node;
    }

    // Puts the chip in the middle of the strip, or as near as the strip can scroll
    function keepInView(node) {
        strip.scrollLeft = node.offsetLeft - (strip.clientWidth - node.offsetWidth) / 2;
    }

    return {
        // Brings the chips up to date with the cube's history. Chips that still show the same moves
        // are kept, so a long history isn't rebuilt after every move.
        update(cube) {
            const moves = [...cube.history, ...[...cube.redoStack].reverse()].map(formatMove);
            let kept = 0;
            while (kept < chips.length && chips[kept].textContent === moves[kept]) {
                kept++;
            }
            chips.splice(kept).forEach(node => node.remove());
            moves.slice(kept).forEach((move, index) => {
                const node = chip(move, kept + index + 1);
                chips.push(node);
                strip.append(node);
            });

            // Hidden with nothing to show, but still taking up its space, so the cube doesn't jump around
            strip.classList.toggle('empty', moves.length === 0);

            // The chip for the latest move made, or Start
            const at = cube.history.length;
            const all = [start, ...chips];
            all.forEach((node, index) => {
                node.classList.toggle('current', index === at);
                node.classList.toggle('ahead', index > at);
                if (index === at) {
                    node.setAttribute('aria-current', 'step');
                } else {
                    node.removeAttribute('aria-current');
                }
            });
            keepInView(all[at]);
        }
    };
}
