const SEEN_KEY = 'rubiks-cube.hint-seen';

// A one-time hint for new visitors (the #hint element in index.html). It goes away at the first press
// anywhere, the first key press, or its Got it button, and the browser remembers not to show it again.
//
// storage: where to remember that, normally the browser's localStorage. It can be missing or refuse
// to work (e.g. in some private windows); then the hint simply shows on every visit.
// target: where to listen for the first press or key, normally the page.
export function showFirstVisitHint({ storage = browserStorage(), target = document } = {}) {
    const hint = document.querySelector('#hint');
    if (wasSeen(storage)) {
        return;
    }

    hint.hidden = false;

    function dismiss() {
        hint.hidden = true;
        rememberSeen(storage);
        target.removeEventListener('pointerdown', dismiss);
        target.removeEventListener('keydown', dismiss);
    }

    target.addEventListener('pointerdown', dismiss);
    target.addEventListener('keydown', dismiss);
    hint.querySelector('button').addEventListener('click', dismiss);
}

function browserStorage() {
    try {
        return window.localStorage;
    } catch {
        return null; // The browser blocks storage for this page
    }
}

function wasSeen(storage) {
    try {
        return storage?.getItem(SEEN_KEY) === 'yes';
    } catch {
        return false;
    }
}

function rememberSeen(storage) {
    try {
        storage?.setItem(SEEN_KEY, 'yes');
    } catch {
        // Can't remember it; the hint will show again next visit, which is fine
    }
}
