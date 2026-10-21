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
import { createSharer, setUpShareButton, shareLink, solutionLink, openLinkedCube } from './ui/share.js';
import { createSolutionPlayer } from './ui/solutionPlayer.js';
import { createToast } from './ui/toast.js';
import { createHistoryStrip } from './ui/historyStrip.js';
import { createGallery } from './ui/gallery.js';
import { createRepeatShow } from './ui/repeatShow.js';

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
const celebrate = moveCount => celebration.play(() => solvedMessage.show(moveCount));
cube.onSolved = celebrate;

// Finds the sticker under the pointer, for turning layers and for painting in the editor
const picker = createStickerPicker({ camera, canvas, cubeModel: cube.model });

// The browser remembers the cube and the editor's draft, so a reload never loses them
const memory = createCubeMemory();

// After anything changes the cube: refresh the buttons and the history strip, and remember the cube
function cubeChanged() {
    toolbar.update(cube);
    historyStrip.update(cube);
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
    openSolver: () => {
        celebration.stop();
        player.open();
    },
    openGallery: () => gallery.open(),
    // A pattern that's still playing finishes first, so it's never left half done
    beforeEach: () => gallery.finishPattern(),
    afterEach: cubeChanged
});

// Buttons: the toolbar at the bottom, the face buttons on the right, and the strip of moves made
const toolbar = createToolbar(runCommand);
createMoveButtons(runCommand, notation => cube.model.highlightFace(notation));
const historyStrip = createHistoryStrip(runCommand);

// The "Color my cube" editor
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
const share = createSharer({ showMessage: toast.show });
setUpShareButton({
    getLink: () => {
        gallery.finishPattern(); // Never share half a pattern
        return shareLink(cube);
    },
    share
});

// The solution player: the app's solution, step by step, or as an auto-solve show
const player = createSolutionPlayer({
    cube,
    controls,
    reduceMotion: () => reducedMotion.matches,
    onFinish: celebrate,
    onChange: cubeChanged,
    onShare: (snapshot, solution) => share(solutionLink(snapshot, solution)),
    showMessage: toast.show,
    onLayoutChange: () => fitCubeOnScreen(),
    onClose: cubeChanged
});

// The pattern gallery, opened with the grid button or the P key: famous patterns to play, and
// "How many repeats?", which repeats a sequence until the cube is back where it started
const gallery = createGallery({
    cube,
    onChange: cubeChanged,
    beforePlay: () => celebration.stop(),
    onRepeat: moves => repeatShow.start(moves)
});
const repeatShow = createRepeatShow({
    cube,
    onFinish: text => celebration.play(() => solvedMessage.showText(text)),
    onLayoutChange: () => fitCubeOnScreen()
});

function openCubeFromLink() {
    const opened = openLinkedCube({
        cube,
        showMessage: toast.show,
        beforeOpen: () => {
            for (const overlay of [editor, player, gallery, repeatShow]) {
                if (overlay.isOpen) {
                    overlay.close();
                }
            }
            gallery.cancelPattern();
            celebration.stop();
        }
    });
    if (opened) {
        cubeChanged();
        // A shared solution opens in the player, ready to play
        if (opened.solution) {
            player.open(opened.solution);
        }
    }
}

// Keys, and dragging stickers to turn layers. Both are switched off while the editor, help, the gallery,
// the solution player or the repeat show is open (the player has its own keys).
setUpKeyboard({ overlays: [editor, help, gallery, player, repeatShow], runCommand });
setUpMouseTurns({
    camera, canvas, cubeModel: cube.model, picker, controls, onCommand: runCommand,
    isEnabled: () => !editor.isOpen && !player.isOpen && !repeatShow.isOpen
});

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
    canRun: () => !editor.isOpen && !player.isOpen && !celebration.isPlaying && !reducedMotion.matches
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
    for (const [overlay, name] of [[editor, 'editor'], [player, 'player'], [repeatShow, 'repeat']]) {
        if (overlay.isOpen) {
            return {
                freeTop: document.querySelector(`.${name}-top`).getBoundingClientRect().bottom,
                freeBottom: document.querySelector(`.${name}-bottom`).getBoundingClientRect().top
            };
        }
    }
    // On upright phones, everything above the history strip, which keeps its place even when empty
    if (uprightPhoneLayout.matches) {
        return { freeBottom: document.querySelector('#history-strip').getBoundingClientRect().top };
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
    gallery.update(deltaSeconds); // Each move of a pattern starts once the last one has landed
    repeatShow.update(deltaSeconds); // After cube.update(), so the count matches the turns that landed
    idleShowcase.update(deltaSeconds);
    player.update(deltaSeconds); // After the idle showcase, so the auto-solve's circling camera wins
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
historyStrip.update(cube);
showFirstVisitHint();
fitCubeOnScreen();
window.addEventListener('resize', fitCubeOnScreen);
renderer.setAnimationLoop(animate);
