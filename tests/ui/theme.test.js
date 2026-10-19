// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because the theme lives on the real <html> element.

import { describe, it, expect, beforeEach } from 'vitest';
import { setUpTheme } from '../../src/ui/theme.js';

// A stand-in for the browser's localStorage
function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key)
    };
}

// A storage that refuses to work, like in some private browser windows
const brokenStorage = {
    getItem() {
        throw new Error('Storage is disabled');
    },
    setItem() {
        throw new Error('Storage is disabled');
    },
    removeItem() {
        throw new Error('Storage is disabled');
    }
};

// A stand-in for matchMedia('(prefers-color-scheme: light)') that tests can switch
function systemSetting(light) {
    const system = new EventTarget();
    system.matches = light;
    system.change = value => {
        system.matches = value;
        system.dispatchEvent(new Event('change'));
    };
    return system;
}

const KEY = 'rubiks-cube.theme';

function theme() {
    return document.documentElement.dataset.theme;
}

function button() {
    return document.querySelector('#theme-button');
}

beforeEach(() => {
    document.body.innerHTML = '<button id="theme-button"></button>';
    delete document.documentElement.dataset.theme;
});

describe('setUpTheme', () => {
    it('follows the system setting when nothing was picked', () => {
        setUpTheme({ storage: memoryStorage(), systemPrefersLight: systemSetting(true) });
        expect(theme()).toBe('light');

        setUpTheme({ storage: memoryStorage(), systemPrefersLight: systemSetting(false) });
        expect(theme()).toBe('dark');
    });

    it('starts with the picked theme, even if the system says otherwise', () => {
        setUpTheme({ storage: memoryStorage({ [KEY]: 'light' }), systemPrefersLight: systemSetting(false) });
        expect(theme()).toBe('light');
    });

    it('ignores a saved value that is not a theme', () => {
        setUpTheme({ storage: memoryStorage({ [KEY]: 'purple' }), systemPrefersLight: systemSetting(false) });
        expect(theme()).toBe('dark');
    });

    it('switches theme with the button, and labels the button with what it switches to', () => {
        setUpTheme({ storage: memoryStorage(), systemPrefersLight: systemSetting(false) });
        expect(button().title).toBe('Switch to the light theme');
        expect(button().getAttribute('aria-label')).toBe('Switch to the light theme');

        button().click();
        expect(theme()).toBe('light');
        expect(button().title).toBe('Switch to the dark theme');

        button().click();
        expect(theme()).toBe('dark');
    });

    it("remembers a pick that differs from the system, and forgets it when the pick matches the system again", () => {
        const storage = memoryStorage();
        setUpTheme({ storage, systemPrefersLight: systemSetting(false) });

        button().click();
        expect(storage.getItem(KEY)).toBe('light');

        button().click();
        expect(storage.getItem(KEY)).toBeNull();
    });

    it('follows the system as it changes, unless the user picked a theme', () => {
        const storage = memoryStorage();
        const system = systemSetting(false);
        setUpTheme({ storage, systemPrefersLight: system });

        system.change(true);
        expect(theme()).toBe('light');

        button().click(); // Picks dark, which now differs from the system
        system.change(true);
        expect(theme()).toBe('dark');
    });

    it('still switches when the browser refuses storage, following the system on the next change', () => {
        const system = systemSetting(false);
        setUpTheme({ storage: brokenStorage, systemPrefersLight: system });
        expect(theme()).toBe('dark');

        button().click();
        expect(theme()).toBe('light');

        system.change(false);
        expect(theme()).toBe('dark');
    });

    it("uses the browser's own storage and system setting by default", () => {
        window.localStorage.setItem(KEY, 'light');
        setUpTheme();
        expect(theme()).toBe('light');
        window.localStorage.clear();
    });
});
