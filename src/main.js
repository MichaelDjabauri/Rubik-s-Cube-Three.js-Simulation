import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCamera, fitCamera, CUBE_RADIUS, START_VIEW } from './scene/camera.js';
import { createCameraGuide } from './scene/cameraGuide.js';
import { createCelebration } from './scene/celebration.js';
import { createIdleShowcase } from './scene/idleShowcase.js';
import { createRenderer } from './scene/renderer.js';
import { createLights, addEnvironment, createShadowFloor } from './scene/lights.js';
import Cube from './cube/Cube.js';
import { setUpKeyboard } from './input/keyboard.js';
import { createCommandRunner } from './input/commands.js';
import { createStickerPicker } from './input/picking.js';
import { setUpMouseTurns } from './input/mouse.js';
import { onDoubleTap } from './input/doubleTap.js';
import { createToolbar } from './ui/toolbar.js';
import { createMoveButtons } from './ui/moveButtons.js';
import { createEditor } from './ui/editor.js';
import { createSolvedMessage } from './ui/solvedMessage.js';
import { createHelp } from './ui/help.js';
import { showFirstVisitHint } from './ui/firstVisitHint.js';
import { setUpTheme } from './ui/theme.js';
import { createCubeMemory } from './ui/savedCube.js';
import { setUpShareButton, shareLink, openLinkedCube } from './ui/share.js';
import { createToast } from './ui/toast.js';

// This file sets everything up first and starts it at the very end, so nothing runs before it exists.
// Where two parts need each other, a small arrow function like () => editor.open() looks the other
// part up only when it's actually used.

// Scene, camera, renderer and lights, plus a floor that catches the cube's shadow
const scene = new THREE.Scene();
const camera = createCamera();
const renderer = createRenderer();
const canvas = renderer.domElement;
addEnvironment(scene, renderer);
scene.add(...createLights(), createShadowFloor());

// The cube: its logical state plus the 3D model that animates its turns
const cube = new Cube();
scene.add(cube.model);

// Camera controls: drag the background to orbit, scroll to zoom
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
const cameraGuide = createCameraGuide(camera, controls);

// A little party when the user solves a scrambled or copied cube: the cube hops and spins,
// confetti flies, and a "Solved!" message pops up with the number of moves.
// People whose system asks for less motion only get the message.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const celebration = createCelebration({
    scene,
    cubeModel: cube.model,
    isCubeBusy: () => cube.animator.isBusy,
    reduceMotion: () => reducedMotion.matches
});
const solvedMessage = createSolvedMessage();
cube.onSolved = moveCount => celebration.play(() => solvedMessage.show(moveCount));

// Finds the sticker under the pointer, for turning layers and for painting in the editor
const picker = createStickerPicker({ camera, canvas, cubeModel: cube.model });

// The browser remembers the cube and the editor's draft, so a reload never loses them
const memory = createCubeMemory();

// After anything changes the cube: refresh the buttons and remember the cube
function cubeChanged() {
    toolbar.update(cube);
    memory.saveCube(cube);
}

// Every command, from the keyboard, the mouse or the buttons, runs here
const runCommand = createCommandRunner({
    cube,
    openEditor: () => {
        celebration.stop(); // No spinning cube while painting
        editor.open();
    },
    openHelp: () => help.open(),
    afterEach: cubeChanged
});

// Buttons: the toolbar at the bottom and the face buttons on the right
const toolbar = createToolbar(runCommand);
createMoveButtons(runCommand, notation => cube.model.highlightFace(notation));

// The "Copy my cube" editor
const editor = createEditor({
    cube,
    picker,
    canvas,
    controls,
    cameraGuide,
    onLayoutChange: () => fitCubeOnScreen(),
    onClose: cubeChanged,
    savedDraft: memory.loadDraft(),
    onDraftChange: text => memory.saveDraft(text)
});

// The help overlay, opened with the ? button or the ? key
const help = createHelp();

// Short messages near the top, like "Link copied"
const toast = createToast();

// Sharing a cube by link, and opening a cube from a link (the part of the address after the #)
setUpShareButton({ getLink: () => shareLink(cube), showMessage: toast.show });

function openCubeFromLink() {
    const opened = openLinkedCube({
        cube,
        showMessage: toast.show,
        beforeOpen: () => {
            if (editor.isOpen) {
                editor.close();
            }
            celebration.stop();
        }
    });
    if (opened) {
        cubeChanged();
    }
}

// Keys, and dragging stickers to turn layers. Both are switched off while the editor or help is open.
setUpKeyboard({ overlays: [editor, help], runCommand });
setUpMouseTurns({ camera, canvas, cubeModel: cube.model, picker, controls, onCommand: runCommand, isEnabled: () => !editor.isOpen });

// Double-click or double-tap to swing the camera back to its starting view (not while painting)
onDoubleTap(canvas, () => {
    if (!editor.isOpen) {
        fitCubeOnScreen();
        cameraGuide.flyTo(START_VIEW);
    }
});

// After a while without input, the camera slowly circles the cube
const idleShowcase = createIdleShowcase({
    controls,
    canRun: () => !editor.isOpen && !celebration.isPlaying && !reducedMotion.matches
});

// Fits the whole cube on screen, into the space the buttons and text leave free (see the CSS in index.html).
// Runs at the start, when the window changes size (e.g. a phone is turned), and when the editor opens or closes.
const uprightPhoneLayout = window.matchMedia('(max-width: 700px)');

function fitCubeOnScreen() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const { distance, offsetY } = fitCamera({ fovDegrees: camera.fov, width, height, ...freeSpace() });

    camera.aspect = width / height;
    if (offsetY !== 0) {
        camera.setViewOffset(width, height, 0, offsetY, width, height);
    } else {
        camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();

    // Keep the current viewing angle, only change the distance
    camera.position.sub(controls.target).setLength(distance).add(controls.target);
    // Zoom limits: not inside the cube, and not so far away that it gets lost
    controls.minDistance = CUBE_RADIUS + 1;
    controls.maxDistance = distance * 2.5;

    renderer.setSize(width, height);
}

// The part of the screen, from the top, that the cube can use: { freeTop, freeBottom } in pixels
function freeSpace() {
    if (editor.isOpen) {
        return {
            freeTop: document.querySelector('.editor-top').getBoundingClientRect().bottom,
            freeBottom: document.querySelector('.editor-bottom').getBoundingClientRect().top
        };
    }
    if (uprightPhoneLayout.matches) {
        return { freeBottom: document.querySelector('#move-buttons').getBoundingClientRect().top };
    }
    return {};
}

// Render loop: runs once per screen refresh
const timer = new THREE.Timer();
// Pause the timer while the tab is hidden, so coming back doesn't count as one huge frame
timer.connect(document);

function animate(timestamp) {
    timer.update(timestamp);
    // Never let time run backwards, even if the browser's clock hiccups
    const deltaSeconds = Math.max(timer.getDelta(), 0);
    cube.update(deltaSeconds);
    idleShowcase.update(deltaSeconds);
    controls.update(deltaSeconds);
    cameraGuide.update(deltaSeconds); // After controls.update(), so a guided camera move wins
    celebration.update(deltaSeconds);
    renderer.render(scene, camera);
}

// Start
setUpTheme();
const savedCube = memory.loadCube();
if (savedCube) {
    cube.restore(savedCube);
}
openCubeFromLink();
window.addEventListener('hashchange', openCubeFromLink);
toolbar.update(cube);
showFirstVisitHint();
fitCubeOnScreen();
window.addEventListener('resize', fitCubeOnScreen);
renderer.setAnimationLoop(animate);
