import CubeDraft from '../cube/CubeDraft.js';
import { validateFacelets } from '../cube/validate.js';
import { FACES } from '../cube/faces.js';

// The red glow on stickers that belong to a problem, e.g. an impossible corner
export const PROBLEM_GLOW = 0x882222;

const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

// The guided steps, one per face. `view` is where the camera looks from: straight at the face,
// tilted a little so the cube still looks 3D. U is seen with F at the bottom and D with F at the top,
// the standard way, which the small tilt towards the front gives automatically.
const STEPS = [
    { face: 'F', label: 'Front', view: [0.25, 0.35, 1], text: 'Hold your cube with the red center on top and the white center facing you. Paint the front face.' },
    { face: 'R', label: 'Right', view: [1, 0.35, -0.25], text: 'Turn your cube so the green center faces you, red still on top. Paint the right face.' },
    { face: 'B', label: 'Back', view: [-0.25, 0.35, -1], text: 'Turn it so the yellow center faces you, red still on top. Paint the back face.' },
    { face: 'L', label: 'Left', view: [-1, 0.35, 0.25], text: 'Turn it so the blue center faces you, red still on top. Paint the left face.' },
    { face: 'U', label: 'Top', view: [0.25, 1, 0.35], text: 'From the start position, tip the top towards you so red faces you and white is at the bottom. Paint the top face.' },
    { face: 'D', label: 'Bottom', view: [0.25, -1, 0.35], text: 'From the start position, tip the top away from you so orange faces you and white is at the top. Paint the bottom face.' }
];

// The "Copy my cube" editor: paint the stickers of a real cube onto the 3D cube, face by face,
// with a live check that the result could be a real cube. Done loads it into `cube`.
//
// The painted draft is kept when the editor closes, so closing never loses work, and reopening
// after Done shows the loaded cube again, ready for corrections. Clear starts over.
//
// It builds its panel into the empty #editor element in index.html, and paints with the pointer
// using `picker` (see input/picking.js).
// onLayoutChange is called when the panel appears, disappears or changes size, so the camera can refit.
// onClose is called when the editor closes.
// savedDraft: a draft remembered from an earlier visit, as written by CubeDraft.toString, or null.
// onDraftChange is called with the draft's text whenever it changes, so it can be remembered.
export function createEditor({
    cube, picker, canvas, controls, cameraGuide, onLayoutChange, onClose,
    savedDraft = null,
    onDraftChange = () => {}
}) {
    let isOpen = false;
    let draft = CubeDraft.fromString(savedDraft) ?? new CubeDraft();
    let stepIndex = 0;
    let selectedFace = 'F';
    let stroke = null; // The paint stroke in progress: { pointerId, erasing }

    const panel = buildPanel();
    setUpPainting();

    function open() {
        // Finish any turn instantly, so the turning animation can't interfere with painting
        cube.animator.clear();
        isOpen = true;
        document.body.classList.add('editing');
        panel.root.hidden = false;
        goToStep(stepIndex);
    }

    // apply: true to load the painted cube, false to leave the cube as it was
    function close(apply) {
        if (apply) {
            cube.loadState(draft.facelets);
        } else {
            cube.model.setStickers(cube.state.facelets);
        }
        cube.model.clearHighlights();

        isOpen = false;
        stroke = null;
        controls.enabled = true;
        canvas.style.cursor = '';
        document.body.classList.remove('editing');
        panel.root.hidden = true;
        onLayoutChange();
        onClose();
    }

    function clear() {
        if (draft.hasPaint && !window.confirm('Clear all the painted stickers?')) {
            return;
        }
        draft = new CubeDraft();
        render();
    }

    function goToStep(index) {
        stepIndex = index;
        panel.instruction.textContent = STEPS[index].text;
        cameraGuide.flyTo(STEPS[index].view);
        render();
        onLayoutChange();
    }

    function selectColor(face) {
        selectedFace = face;
        render();
    }

    // Brings the 3D cube and the panel up to date with the draft
    function render() {
        const { valid, problems } = validateFacelets(draft.facelets);
        onDraftChange(draft.toString());

        cube.model.setStickers(draft.facelets);
        // The current face glows softly, and stickers involved in a problem glow red
        cube.model.clearHighlights();
        cube.model.highlightStickers(faceIndices(STEPS[stepIndex].face));
        cube.model.highlightStickers(problems.flatMap(problem => problem.facelets), PROBLEM_GLOW);

        panel.status.textContent = valid
            ? 'This cube can be solved. Press Done to use it.'
            : problems.map(problem => problem.message).join(' ');
        panel.status.classList.toggle('ok', valid);
        panel.status.classList.toggle('problem', problems.some(problem => problem.type !== 'incomplete'));
        panel.done.disabled = !valid;

        STEPS.forEach((step, index) => {
            const isComplete = faceIndices(step.face).every(sticker => draft.facelets[sticker] !== null);
            panel.stepButtons[index].classList.toggle('complete', isComplete);
            panel.stepButtons[index].classList.toggle('current', index === stepIndex);
        });

        for (const { face, button, count } of panel.swatches) {
            const painted = draft.count(face.notation);
            count.textContent = `${painted}/9`;
            count.classList.toggle('over', painted > 9);
            button.classList.toggle('selected', face.notation === selectedFace);
        }
    }

    // Builds the panel's elements into #editor:
    //   top:    the instruction for the current face
    //   bottom: the status line, the face tabs, the color palette and the action buttons
    function buildPanel() {
        const root = document.querySelector('#editor');
        const instruction = element('p', 'editor-instruction');
        const status = element('p', 'editor-status');

        const stepButtons = STEPS.map((step, index) => button(step.label, () => goToStep(index)));

        const swatches = FACES.map(face => {
            const count = element('span', 'swatch-count');
            const swatch = button('', () => selectColor(face.notation));
            swatch.className = 'swatch';
            swatch.title = face.color;
            swatch.style.setProperty('--swatch', face.hex);
            swatch.append(element('span', 'swatch-color'), count);
            return { face, button: swatch, count };
        });

        const done = button('Done', () => close(true));
        done.classList.add('primary');
        const actions = [button('Clear', clear), button('Close', () => close(false)), done];

        root.append(
            element('div', 'editor-top', [instruction]),
            element('div', 'editor-bottom', [
                status,
                element('div', 'editor-steps', stepButtons),
                element('div', 'editor-palette', swatches.map(swatch => swatch.button)),
                element('div', 'editor-actions', actions)
            ])
        );

        return { root, instruction, status, stepButtons, swatches, done };
    }

    // Painting with the pointer: press on a sticker to paint it with the selected color, and keep
    // moving to paint more. Pressing a sticker that already has the selected color erases instead,
    // for the whole stroke. Pressing the background or a center still orbits the camera.
    function setUpPainting() {
        // Capture phase, so this runs before OrbitControls and can stop it from orbiting
        canvas.addEventListener('pointerdown', (event) => {
            if (!isOpen || stroke) {
                return; // Closed, or a second finger while painting
            }
            const sticker = picker.pick(event);
            if (!sticker || draft.isCenter(sticker.faceletIndex)) {
                return;
            }

            controls.enabled = false;
            canvas.setPointerCapture(event.pointerId);
            stroke = { pointerId: event.pointerId, erasing: draft.facelets[sticker.faceletIndex] === selectedFace };
            paintSticker(sticker.faceletIndex);
        }, { capture: true });

        canvas.addEventListener('pointermove', (event) => {
            if (!isOpen) {
                return;
            }
            const sticker = picker.pick(event);

            if (!stroke) {
                // Show a pointing hand over paintable stickers when using a mouse
                if (event.pointerType !== 'touch') {
                    canvas.style.cursor = sticker && !draft.isCenter(sticker.faceletIndex) ? 'pointer' : '';
                }
                return;
            }
            if (event.pointerId === stroke.pointerId && sticker) {
                paintSticker(sticker.faceletIndex);
            }
        });

        const endStroke = (event) => {
            if (stroke && event.pointerId === stroke.pointerId) {
                stroke = null;
                controls.enabled = true;
            }
        };
        canvas.addEventListener('pointerup', endStroke);
        canvas.addEventListener('pointercancel', endStroke);
    }

    function paintSticker(index) {
        const changed = stroke.erasing ? draft.erase(index, selectedFace) : draft.paint(index, selectedFace);
        if (changed) {
            render();
        }
    }

    return {
        open,
        close: () => close(false),
        get isOpen() {
            return isOpen;
        }
    };
}

// The 9 sticker indices of a face, in CubeState's layout
function faceIndices(face) {
    const start = FACE_ORDER.indexOf(face) * 9;
    return Array.from({ length: 9 }, (_, i) => start + i);
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
