// Runs commands on the cube. Commands come from the keyboard, the mouse and the buttons,
// e.g. { type: 'move', notation: "R'" } or { type: 'undo' }.
// openEditor, openHelp and openSolver open the "Color my cube" editor, the help overlay and the solution player.
// afterEach is called after every command, e.g. to refresh the buttons.
export function createCommandRunner({ cube, openEditor, openHelp, openSolver, afterEach }) {
    const actions = {
        move: command => cube.move(command.notation),
        scramble: () => cube.scramble(),
        undo: () => cube.undo(),
        redo: () => cube.redo(),
        reset: () => cube.reset(),
        solved: () => cube.resetToSolved(),
        edit: () => openEditor(),
        help: () => openHelp(),
        solve: () => openSolver()
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
