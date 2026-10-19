import { browserStorage, readSetting, writeSetting } from './storage.js';

// The same key is read by the small script in index.html's <head>, which picks the theme before the first paint
const THEME_KEY = 'rubiks-cube.theme';
const THEMES = ['dark', 'light'];

// A dark or light look for the page. It follows the system setting until the user picks one with the
// theme button (#theme-button), and the browser remembers that pick. Picking the theme the system already
// uses forgets the pick again, so the page goes back to following the system.
// The theme is set as data-theme="dark" or "light" on <html>; the CSS in index.html does the rest.
//
// storage: where to remember the pick, normally the browser's localStorage (see storage.js).
// systemPrefersLight: a media query list for the system setting, normally (prefers-color-scheme: light).
export function setUpTheme({
    storage = browserStorage(),
    systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)')
} = {}) {
    const root = document.documentElement;
    const button = document.querySelector('#theme-button');

    const systemTheme = () => (systemPrefersLight.matches ? 'light' : 'dark');
    const pickedTheme = () => {
        const saved = readSetting(storage, THEME_KEY);
        return THEMES.includes(saved) ? saved : null;
    };

    function show(theme) {
        root.dataset.theme = theme;
        button.title = `Switch to the ${theme === 'light' ? 'dark' : 'light'} theme`;
        button.setAttribute('aria-label', button.title);
    }

    button.addEventListener('click', () => {
        const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
        writeSetting(storage, THEME_KEY, theme === systemTheme() ? null : theme);
        show(theme);
    });

    // Follow the system as it changes, e.g. when it switches to dark in the evening, unless the user picked a theme
    systemPrefersLight.addEventListener('change', () => show(pickedTheme() ?? systemTheme()));

    show(pickedTheme() ?? systemTheme());
}
