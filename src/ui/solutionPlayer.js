import { solveCube } from '../cube/solver.js';
import { formatMove } from '../cube/notation.js';
import { FACES } from '../cube/faces.js';

// The pause between moves while playing, so each turn can be followed on a real cube
const PLAY_PAUSE_S = 0.35;
// Jumps through many moves at once (scrubbing, Restart) play quickly, at most this long in total
const JUMP_DURATION_S = 1;
const FAST_TURN_DURATION_S = 0.08;
// The auto-solve starts at this turn length and speeds up to the fastest
const AUTO_FIRST_TURN_S = 0.3;
const AUTO_FASTEST_TURN_S = 0.05;
const AUTO_SPEED_UP = 0.93; // Each turn takes this share of the one before
// How fast the camera circles the cube during the auto-solve (OrbitControls' autoRotateSpeed)
const AUTO_CAMERA_START = 2;
const AUTO_CAMERA_END = 10;

// How each face turns, in words, for someone following along on a real cube held the app's way:
// red on top, white facing you. [clockwise, counterclockwise]
const TURN_WORDS = {
    U: ['the front goes left', 'the front goes right'],
    D: ['the front goes right', 'the front goes left'],
    F: ['the top goes right', 'the top goes left'],
    B: ['the top goes left', 'the top goes right'],
    R: ['the front goes up', 'the front goes down'],
    L: ['the front goes down', 'the front goes up']
};
const FACE_NAMES = { U: 'top', D: 'bottom', F: 'front', B: 'back', R: 'right', L: 'left' };

// The plain-words description of a move, e.g. "Turn the right (green) face so the front goes down"
export function describeMove({ face, turns }) {
    const color = FACES.find(candidate => candidate.notation === face).color;
    const which = `the ${FACE_NAMES[face]} (${color}) face`;
    if (turns === 2) {
        return `Turn ${which} halfway around`;
    }
    return `Turn ${which} so ${TURN_WORDS[face][turns === 1 ? 0 : 1]}`;
}

// The solution player: shows the app's solution for the cube one move at a time, with the stage it
// belongs to and the move in plain words, and the face about to turn glowing. Step with Back and Next
// (or the arrow keys), play and pause (or Space), drag the slider to scrub, or let Auto-solve play the
// rest as a show: faster and faster, with the camera circling the cube, ending in a celebration.
//
// The moves go into the cube's history like any others, so closing the player halfway leaves the cube
// where it is, and Undo and Reset still work.
//
// It builds its panel into the empty #player element in index.html.
//   controls        the OrbitControls, which circle the camera during the auto-solve
//   reduceMotion    returns true when the system asks for less motion: no speeding up, no circling camera
//   onFinish        called with the number of moves when the solution has played to the end
//   onChange        called after every move, e.g. to remember the cube
//   onShare         called with (the cube's snapshot when the solution started, the solution) to share it
//   showMessage     shows a short message, e.g. that the cube is already solved
//   onLayoutChange  called when the panel appears or disappears, so the camera can refit
//   onClose         called when the player closes
export function createSolutionPlayer({
    cube, controls, reduceMotion, onFinish, onChange, onShare, showMessage, onLayoutChange, onClose
}) {
    let isOpen = false;
    let solution = null;  // { stages, moves }
    let startSnapshot = null; // The cube when the solution started, for sharing
    let base = 0;         // The length of the cube's history when the solution started
    let mode = 'paused';  // 'paused', 'playing' or 'auto'
    let waitLeft = 0;     // Seconds until the next move while playing
    let autoTurns = 0;    // Moves played so far by the auto-solve
    let finished = false; // Whether the end has been celebrated since it was last reached
    let highlightedAt = null; // The position whose next face is glowing

    const panel = buildPanel();

    // Opens the player. solution: one to show, e.g. from a shared link; without it, the app solves the cube now.
    // Returns whether it opened: a solved cube has nothing to show.
    function open(given = null) {
        if (cube.state.isSolved()) {
            showMessage('The cube is already solved. Scramble it first!');
            return false;
        }
        solution = given ?? solveCube(cube.state.facelets);
        startSnapshot = cube.snapshot();
        base = cube.history.length;
        mode = 'paused';
        finished = false;
        highlightedAt = null;

        isOpen = true;
        document.body.classList.add('solving');
        panel.root.hidden = false;
        panel.slider.max = String(solution.moves.length);
        panel.slider.style.setProperty('--stages', stageBands());
        render();
        onLayoutChange();
        return true;
    }

    function close() {
        stopAuto();
        mode = 'paused';
        cube.model.highlightFace(null);
        isOpen = false;
        document.body.classList.remove('solving');
        panel.root.hidden = true;
        onLayoutChange();
        onClose();
    }

    // How many of the solution's moves have been made
    function position() {
        return cube.history.length - base;
    }

    function forward(duration) {
        cube.playSolutionMove(solution.moves[position()], duration);
        onChange();
    }

    function back(duration) {
        cube.undo(duration);
        finished = false;
        onChange();
    }

    function next() {
        pause();
        if (position() < solution.moves.length) {
            forward();
            render();
        }
    }

    function previous() {
        pause();
        if (position() > 0) {
            back();
            render();
        }
    }

    // Moves straight to any point of the solution, with quick turns
    function jumpTo(target) {
        pause();
        const steps = Math.abs(target - position());
        const duration = Math.min(FAST_TURN_DURATION_S, JUMP_DURATION_S / steps);
        while (position() < target) {
            forward(duration);
        }
        while (position() > target) {
            back(duration);
        }
        render();
    }

    function togglePlay() {
        if (mode === 'playing') {
            pause();
        } else if (position() < solution.moves.length) {
            stopAuto();
            mode = 'playing';
            waitLeft = 0;
        }
        render();
    }

    function pause() {
        stopAuto();
        mode = 'paused';
    }

    // Plays the rest of the solution as a show, then celebrates and closes
    function autoSolve() {
        if (position() >= solution.moves.length) {
            return;
        }
        mode = 'auto';
        autoTurns = 0;
        cube.model.highlightFace(null);
        render();
    }

    function stopAuto() {
        if (mode === 'auto') {
            controls.autoRotate = false;
        }
    }

    // Called every frame from the render loop with the seconds since the last frame
    function update(deltaSeconds) {
        if (!isOpen) {
            return;
        }
        const total = solution.moves.length;

        if (mode === 'auto') {
            if (!reduceMotion()) {
                const progress = Math.min(autoTurns / total, 1);
                controls.autoRotate = true;
                controls.autoRotateSpeed = AUTO_CAMERA_START + (AUTO_CAMERA_END - AUTO_CAMERA_START) * progress;
            }
            // Keep the next turn waiting in line, so there's no gap between fast turns
            while (position() < total && cube.animator.turnQueue.length === 0) {
                forward(autoTurnDuration());
                autoTurns++;
            }
            if (position() === total && !cube.animator.isBusy) {
                stopAuto();
                mode = 'paused';
                finished = true;
                onFinish(total);
                close();
                return;
            }
            render();
            return;
        }

        if (mode === 'playing' && !cube.animator.isBusy) {
            waitLeft -= deltaSeconds;
            if (waitLeft <= 0 && position() < total) {
                forward();
                waitLeft = PLAY_PAUSE_S;
                render();
            }
        }

        if (!cube.animator.isBusy) {
            if (mode === 'playing' && position() === total) {
                mode = 'paused';
                render();
            }
            if (position() === total && !finished) {
                finished = true;
                onFinish(total);
            }
            // The face about to turn glows, once the last turn has landed
            if (highlightedAt !== position()) {
                highlightedAt = position();
                cube.model.highlightFace(position() < total ? solution.moves[position()].face : null);
            }
        }
    }

    function autoTurnDuration() {
        if (reduceMotion()) {
            return AUTO_FIRST_TURN_S;
        }
        return Math.max(AUTO_FIRST_TURN_S * AUTO_SPEED_UP ** autoTurns, AUTO_FASTEST_TURN_S);
    }

    // Keys while the player is open. Returns true if the key was used.
    function handleKey(event) {
        const actions = {
            ArrowRight: next,
            ArrowLeft: previous,
            ' ': togglePlay,
            Escape: close
        };
        const action = actions[event.key];
        if (!action) {
            return false;
        }
        action();
        return true;
    }

    // Brings the panel up to date with the position in the solution
    function render() {
        const total = solution.moves.length;
        const at = position();
        const stageIndex = stageAt(at);
        const stage = solution.stages[stageIndex];

        if (at < total) {
            const move = solution.moves[at];
            panel.stage.textContent = `Stage ${stageIndex + 1} of ${solution.stages.length}: ${stage.name}`;
            panel.notation.textContent = formatMove(move);
            panel.words.textContent = describeMove(move);
        } else {
            panel.stage.textContent = 'All stages done';
            panel.notation.textContent = 'Solved!';
            panel.words.textContent = `${total} moves with the beginner method`;
        }

        panel.slider.value = String(at);
        panel.count.textContent = `Move ${Math.min(at + 1, total)} of ${total}`;
        panel.back.disabled = at === 0 || mode === 'auto';
        panel.restart.disabled = at === 0 || mode === 'auto';
        panel.next.disabled = at === total || mode === 'auto';
        panel.play.disabled = at === total || mode === 'auto';
        panel.auto.disabled = at === total || mode === 'auto';
        panel.slider.disabled = mode === 'auto';
        panel.play.textContent = mode === 'playing' ? 'Pause' : 'Play';
    }

    // The stage the move at `at` belongs to (the last stage once the solution is done).
    // Stages with no moves are skipped.
    function stageAt(at) {
        let end = 0;
        for (const [index, stage] of solution.stages.entries()) {
            end += stage.moves.length;
            if (at < end) {
                return index;
            }
        }
        return solution.stages.length - 1;
    }

    // The slider's background: a colored band for each stage, as wide as its share of the moves
    function stageBands() {
        const total = solution.moves.length;
        let start = 0;
        const stops = solution.stages.map((stage, index) => {
            const end = start + stage.moves.length;
            const color = `var(--stage-${index + 1})`;
            const band = `${color} ${(start / total) * 100}% ${(end / total) * 100}%`;
            start = end;
            return band;
        });
        return `linear-gradient(to right, ${stops.join(', ')})`;
    }

    // Builds the panel into #player:
    //   top:    the stage, and the next move in notation and in words
    //   bottom: the slider with the move count, the step buttons, and Auto-solve, Share and Close
    function buildPanel() {
        const root = document.querySelector('#player');
        const stage = element('p', 'player-stage');
        const notation = element('p', 'player-notation');
        const words = element('p', 'player-words');

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.className = 'player-slider';
        slider.setAttribute('aria-label', 'Position in the solution');
        slider.addEventListener('input', () => jumpTo(Number(slider.value)));
        const count = element('span', 'player-count');

        const buttons = {
            restart: button('Restart', () => jumpTo(0)),
            back: button('Back', previous),
            play: button('Play', togglePlay),
            next: button('Next', next),
            auto: button('Auto-solve', autoSolve),
            share: button('Share', () => onShare(startSnapshot, solution)),
            close: button('Close', close)
        };
        buttons.auto.classList.add('primary');

        root.append(
            element('div', 'player-top', [stage, notation, words]),
            element('div', 'player-bottom', [
                element('div', 'player-progress', [slider, count]),
                element('div', 'player-controls', [buttons.restart, buttons.back, buttons.play, buttons.next]),
                element('div', 'player-actions', [buttons.auto, buttons.share, buttons.close])
            ])
        );

        return { root, stage, notation, words, slider, count, ...buttons };
    }

    return {
        open,
        close,
        update,
        handleKey,
        get isOpen() {
            return isOpen;
        },
        get isAutoSolving() {
            return mode === 'auto';
        }
    };
}

function element(tag, className, children = []) {
    const node = document.createElement(tag);
    node.className = className;
    node.append(...children);
    return node;
}

// A button that takes its focus away after a click, so pressing Space or Enter later doesn't click it again
function button(label, onClick) {
    const node = document.createElement('button');
    node.textContent = label;
    node.addEventListener('click', () => {
        node.blur();
        onClick();
    });
    return node;
}
