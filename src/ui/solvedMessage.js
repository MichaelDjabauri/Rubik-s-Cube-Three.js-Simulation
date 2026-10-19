// The "Solved!" message that pops up in the middle of the screen and fades away by itself
// (the animation is in index.html's CSS). Uses the empty #solved-message element in index.html.
export function createSolvedMessage() {
    const message = document.querySelector('#solved-message');

    return {
        show(moveCount) {
            message.replaceChildren(
                textElement('strong', 'Solved!'),
                textElement('span', `in ${moveCount} ${moveCount === 1 ? 'move' : 'moves'}`)
            );
            // Restart the pop-in animation, even if the message is still showing from last time
            message.classList.remove('show');
            void message.offsetWidth; // Makes the browser notice the class was removed
            message.classList.add('show');
        }
    };
}

function textElement(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
}
