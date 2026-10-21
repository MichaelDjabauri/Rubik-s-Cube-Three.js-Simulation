// Runs commands on the cube. Commands come from the keyboard, the mouse and the buttons,
// e.g. { type: 'move', notation: "R'" } or { type: 'undo' }.
// openEditor, openHelp, openSolver and openGallery open the "Color my cube" editor, the help overlay,
// the solution player and the pattern gallery.
// beforeEach is called before every command, e.g. to finish a pattern that's still playing,
// and afterEach after every command, e.g. to refresh the buttons.
export function createCommandRunner({
    cube, openEditor, openHelp, openSolver, openGallery, beforeEach = () => {}, afterEach
}) {
    const actions = {
        move: command => cube.move(command.notation),
        scramble: () => cube.scramble(),
        undo: () => cube.undo(),
        redo: () => cube.redo(),
        reset: () => cube.reset(),
        travel: command => cube.travelTo(command.to),
        solved: () => cube.resetToSolved(),
        edit: () => openEditor(),
        help: () => openHelp(),
        solve: () => openSolver(),
        patterns: () => openGallery()
    };

    return function runCommand(command) {
        const action = actions[command.type];
        if (!action) {
            throw new Error(`Unknown command: ${command.type}`);
        }
        beforeEach();
        action(command);
        afterEach();
    };
}
