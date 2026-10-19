const FACE_KEYS = new Set(['U', 'D', 'F', 'B', 'R', 'L']);

// Turns a keydown event into a command for the cube, or null if the key should be ignored.
// Takes a plain object with the event's fields, so it can be tested without a browser.
//
//   U D F B R L          turn that face clockwise, with Shift counterclockwise
//   Ctrl+Z               undo (Cmd+Z also works on a Mac)
//   Ctrl+Shift+Z         redo (Cmd+Shift+Z also works on a Mac)
export function commandForKey({ key, shiftKey, ctrlKey, metaKey, altKey, repeat }) {
    const letter = key.toUpperCase();
    const commandKey = ctrlKey || metaKey;

    // Holding the shortcut down keeps undoing (or redoing), as in most apps
    if (commandKey && !altKey && letter === 'Z') {
        return { type: shiftKey ? 'redo' : 'undo' };
    }

    // Leave other shortcuts like Ctrl+F (find) and Cmd+R (reload) to the browser,
    // and ignore auto-repeat from a held face key so it doesn't flood the turn queue
    if (commandKey || altKey || repeat) {
        return null;
    }

    if (FACE_KEYS.has(letter)) {
        return { type: 'move', notation: shiftKey ? `${letter}'` : letter };
    }

    return null;
}
