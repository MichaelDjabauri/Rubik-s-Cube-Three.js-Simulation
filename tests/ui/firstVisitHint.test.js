// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the hint is a real HTML element.

import { describe, it, expect, beforeEach } from 'vitest';
import { showFirstVisitHint } from '../../src/ui/firstVisitHint.js';

// A stand-in for the browser's localStorage
function memoryStorage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
    };
}

// A storage that refuses to work, like in some private browser windows
const brokenStorage = {
    getItem() {
        throw new Error('Storage is disabled');
    },
    setItem() {
        throw new Error('Storage is disabled');
    }
};

let target;

beforeEach(() => {
    document.body.innerHTML = '<div id="hint" hidden><span>Drag a sticker…</span><button>Got it</button></div>';
    target = new EventTarget();
});

function hint() {
    return document.querySelector('#hint');
}

describe('showFirstVisitHint', () => {
    it('shows the hint on the first visit', () => {
        showFirstVisitHint({ storage: memoryStorage(), target });
        expect(hint().hidden).toBe(false);
    });

    it('goes away with Got it, and stays away on the next visit', () => {
        const storage = memoryStorage();
        showFirstVisitHint({ storage, target });
        hint().querySelector('button').click();
        expect(hint().hidden).toBe(true);

        hint().hidden = true;
        showFirstVisitHint({ storage, target });
        expect(hint().hidden).toBe(true);
    });

    it('goes away at the first press or key press anywhere', () => {
        for (const type of ['pointerdown', 'keydown']) {
            showFirstVisitHint({ storage: memoryStorage(), target });
            target.dispatchEvent(new Event(type));
            expect(hint().hidden, type).toBe(true);
        }
    });

    it('stops listening once it is gone', () => {
        const storage = memoryStorage();
        showFirstVisitHint({ storage, target });
        target.dispatchEvent(new Event('pointerdown'));
        hint().hidden = false; // If it were still listening, the next press would hide this again
        target.dispatchEvent(new Event('pointerdown'));
        expect(hint().hidden).toBe(false);
    });

    it('still works, showing every visit, when the browser refuses storage', () => {
        showFirstVisitHint({ storage: brokenStorage, target });
        expect(hint().hidden).toBe(false);
        target.dispatchEvent(new Event('keydown'));
        expect(hint().hidden).toBe(true);
    });

    it('still works with no storage at all', () => {
        showFirstVisitHint({ storage: null, target });
        expect(hint().hidden).toBe(false);
    });

    it("uses the browser's own storage and the page by default", () => {
        window.localStorage.clear();
        showFirstVisitHint();
        expect(hint().hidden).toBe(false);
        document.dispatchEvent(new Event('keydown'));
        expect(window.localStorage.getItem('rubiks-cube.hint-seen')).toBe('yes');
    });

    it('still works when the browser blocks storage for the whole page', () => {
        const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() {
                throw new Error('Access to storage is denied');
            }
        });
        try {
            showFirstVisitHint({ target });
            expect(hint().hidden).toBe(false);
        } finally {
            Object.defineProperty(window, 'localStorage', original);
        }
    });
});
