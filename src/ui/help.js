// The help overlay that lists every control. Its content is static HTML in index.html (#help);
// this only opens and closes it.
// Opens from the ? button or the ? key. Closes with its Close button, Escape (see keyboard.js),
// or a click on the dimmed background outside the panel.
export function createHelp() {
    const overlay = document.querySelector('#help');
    const openButton = document.querySelector('#help-button');
    const closeButton = overlay.querySelector('.help-close');

    function open() {
        overlay.hidden = false;
        closeButton.focus(); // So keyboard users can close it right away with Enter
    }

    function close() {
        overlay.hidden = true;
    }

    openButton.addEventListener('click', () => {
        openButton.blur();
        open();
    });
    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            close();
        }
    });

    return {
        open,
        close,
        get isOpen() {
            return !overlay.hidden;
        }
    };
}
