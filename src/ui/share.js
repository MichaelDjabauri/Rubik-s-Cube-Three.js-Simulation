import { encodeCube, decodeCube } from '../cube/cubeCode.js';
import CubeState from '../cube/CubeState.js';

// Sharing a cube by link. The link is this page's address with the cube written after the #
// (see cubeCode.js): its starting point, the moves made, and the scramble or pattern. Opening the link shows
// exactly the same cube, and Reset and Undo work the same way as for the person who shared it.

// The link for the cube as it is now
export function shareLink(cube, location = window.location) {
    return linkFor(shareablePart(cube.snapshot()), location);
}

// The link for a solution: the cube as it was when the solution started (a snapshot), plus the solution
export function solutionLink(snapshot, solution, location = window.location) {
    return linkFor({ ...shareablePart(snapshot), solution }, location);
}

function linkFor(cubeParts, location) {
    return `${location.origin}${location.pathname}#${encodeCube(cubeParts)}`;
}

// What a link carries: not the redo moves or the solve's move count, which belong to the sharer
function shareablePart({ start, history, scramble, pattern }) {
    return { start, history, scramble, pattern };
}

// Shares a link: on phones and tablets with the system's share sheet; elsewhere it copies the link and
// says so. If copying isn't allowed, it shows the link to copy by hand.
//
// showMessage: shows a short message, e.g. "Link copied".
// The rest stand in for the browser in tests.
export function createSharer({
    showMessage,
    navigator = window.navigator,
    isTouchScreen = () => window.matchMedia('(pointer: coarse)').matches,
    showLink = link => window.prompt('Copy this link to share your cube:', link)
}) {
    return async function share(link) {
        if (isTouchScreen() && navigator.share) {
            try {
                await navigator.share({ title: document.title, text: 'Can you solve this cube?', url: link });
                return;
            } catch (error) {
                if (error.name === 'AbortError') {
                    return; // The user closed the share sheet
                }
                // Sharing didn't work, so copy the link instead
            }
        }

        try {
            await navigator.clipboard.writeText(link);
            showMessage('Link copied. Send it to a friend to share this cube.');
        } catch {
            showLink(link);
        }
    };
}

// The Share button in the corner (#share-button), which shares the cube as it is now.
// getLink: returns the link. share: a sharer from createSharer.
export function setUpShareButton({ getLink, share }) {
    const button = document.querySelector('#share-button');
    button.addEventListener('click', () => {
        button.blur();
        return share(getLink());
    });
}

// Opens the cube in the page address, if there is one, then takes it out of the address so a reload
// shows the cube the browser remembers rather than opening the link again.
// Returns null if it didn't open a cube, or { solution } if it did: the link's solution, or null if it had
// none. A solution that doesn't solve the cube is left out, with a message.
//
// If the current cube has progress (moves, or a copied cube) and isn't the same as the linked one,
// it asks before replacing it. beforeOpen is called right before the cube changes, e.g. to close the editor.
export function openLinkedCube({
    cube,
    showMessage,
    beforeOpen = () => {},
    location = window.location,
    history = window.history,
    confirm = text => window.confirm(text)
}) {
    const code = location.hash.slice(1);
    if (code === '') {
        return null;
    }
    history.replaceState(null, '', location.pathname + location.search);

    const snapshot = decodeCube(code);
    if (!snapshot) {
        showMessage("The cube in this link couldn't be opened. Maybe the link got cut off?");
        return null;
    }

    const isSameCube = encodeCube(shareablePart(snapshot)) === encodeCube(shareablePart(cube.snapshot()));
    if (cube.hasProgress && !isSameCube &&!confirm('Open the shared cube? It replaces the cube you have now.')) {
        return null;
    }

    beforeOpen();
    cube.restore({ ...shareablePart(snapshot), redo: [], solveMoveCount: null });
    // Solving it counts from here, so it celebrates when solved
    cube.beginSolve();

    let { solution } = snapshot;
    if (solution && !new CubeState(cube.state.facelets).applyMoves(solution.moves).isSolved()) {
        showMessage("The solution in this link doesn't solve its cube, so only the cube was opened.");
        solution = null;
    }
    return { solution };
}
