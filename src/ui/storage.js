// Small settings remembered in the browser's localStorage. Storage can be missing or refuse to work
// (e.g. in some private windows), so every access is guarded; then nothing is remembered, which is fine.

// The browser's localStorage, or null if the browser blocks it for this page
export function browserStorage() {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

// The saved value, or null if there is none or it can't be read
export function readSetting(storage, key) {
    try {
        return storage?.getItem(key) ?? null;
    } catch {
        return null;
    }
}

// Saves a value, or forgets it when value is null
export function writeSetting(storage, key, value) {
    try {
        if (value === null) {
            storage?.removeItem(key);
        } else {
            storage?.setItem(key, value);
        }
    } catch {
        // Can't remember it this time
    }
}
