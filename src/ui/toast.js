const SHOW_MS = 3000;

// A short message near the top of the screen (#toast in index.html) that goes away by itself
export function createToast() {
    const toast = document.querySelector('#toast');
    let hideTimer = null;

    return {
        show(text) {
            toast.textContent = text;
            toast.hidden = false;
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                toast.hidden = true;
            }, SHOW_MS);
        }
    };
}
