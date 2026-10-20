import { encodeCube, decodeCube } from '../cube/cubeCode.js';

// Sharing a cube by link. The link is this page's address with the cube written after the #
// (see cubeCode.js): its starting point, the moves made, and the scramble. Opening the link shows
// exactly the same cube, and Reset and Undo work the same way as for the person who shared it.

// The link for the cube as it is now
export function shareLink(cube, location = window.location) {
    return `${location.origin}${location.pathname}#${encodeCube(shareablePart(cube.snapshot()))}`;
}

// What a link carries: not the redo moves or the solve's move count, which belong to the sharer
function shareablePart({ start, history, scramble }) {
    return { start, history, scramble };
}

// The Share button (#share-button). On phones and tablets it opens the system's share sheet; elsewhere
// it copies the link and says so. If copying isn't allowed, it shows the link to copy by hand.
//
// getLink: returns the link to share.
// showMessage: shows a short message, e.g. "Link copied".
// The rest stand in for the browser in tests.
export function setUpShareButton({
    getLink,
    showMessage,
    navigator = window.navigator,
    isTouchScreen = () => window.matchMedia('(pointer: coarse)').matches,
    showLink = link => window.prompt('Copy this link to share your cube:', link)
}) {
    const button = document.querySelector('#share-button');

    async function share() {
        const link = getLink();

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
    }

    button.addEventListener('click', () => {
        button.blur();
        return share();
    });

    return { share };
}

// Opens the cube in the page address, if there is one, then takes it out of the address so a reload
// shows the cube the browser remembers rather than opening the link again.
// Returns true if it opened a cube.
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
        return false;
    }
    history.replaceState(null, '', location.pathname + location.search);

    const snapshot = decodeCube(code);
    if (!snapshot) {
        showMessage("The cube in this link couldn't be opened. Maybe the link got cut off?");
        return false;
    }

    const hasProgress = cube.canUndo || cube.startsFromCopy;
    const isSameCube = encodeCube(shareablePart(snapshot)) === encodeCube(shareablePart(cube.snapshot()));
    if (hasProgress && !isSameCube && !confirm('Open the shared cube? It replaces the cube you have now.')) {
        return false;
    }

    beforeOpen();
    cube.restore({ ...shareablePart(snapshot), redo: [], solveMoveCount: null });
    // Solving it counts from here, so it celebrates when solved
    cube.beginSolve();
    return true;
}
