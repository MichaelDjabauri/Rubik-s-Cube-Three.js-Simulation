// Runs commands on the cube. Commands come from the keyboard, the mouse and the buttons,
// e.g. { type: 'move', notation: "R'" } or { type: 'undo' }.
// openEditor and openHelp open the "Copy my cube" editor and the help overlay.
// afterEach is called after every command, e.g. to refresh the buttons.
export function createCommandRunner({ cube, openEditor, openHelp, afterEach }) {
    const actions = {
        move: command => cube.move(command.notation),
        scramble: () => cube.scramble(),
        undo: () => cube.undo(),
        redo: () => cube.redo(),
        reset: () => cube.reset(),
        solved: () => cube.resetToSolved(),
        edit: () => openEditor(),
        help: () => openHelp()
    };

    return function runCommand(command) {
        const action = actions[command.type];
        if (!action) {
            throw new Error(`Unknown command: ${command.type}`);
        }
        action(command);
        afterEach();
    };
}
