// @vitest-environment happy-dom
// This file runs in a simulated web page (happy-dom), because sharing uses a real button.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shareLink, solutionLink, createSharer, setUpShareButton, openLinkedCube } from '../../src/ui/share.js';
import { solveCube } from '../../src/cube/solver.js';
import Cube from '../../src/cube/Cube.js';
import CubeState from '../../src/cube/CubeState.js';
import { parseMoves } from '../../src/cube/notation.js';
import { readFacelets } from '../helpers/readFacelets.js';

const PAGE = { origin: 'https://example.com', pathname: '/cube/', search: '' };

function seededRandom(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

// The part after the # in a link
function hashOf(link) {
    return `#${link.split('#')[1]}`;
}

let messages;

beforeEach(() => {
    document.body.innerHTML = '<button id="share-button"></button>';
    messages = [];
});

describe('shareLink', () => {
    it("puts the cube's start, moves and scramble after the page address, but not redo moves or the solve count", () => {
        const cube = new Cube();
        cube.scramble(seededRandom(1));
        cube.move("R U");
        cube.undo();

        const link = shareLink(cube, PAGE);
        expect(link.startsWith('https://example.com/cube/#v=1&moves=')).toBe(true);
        expect(link).toContain('&scramble=');
        expect(link).not.toContain('redo=');
        expect(link).not.toContain('solve=');
    });
});

describe('createSharer', () => {
    function setUp({ navigator, isTouchScreen = () => false }) {
        const shownLinks = [];
        const sharer = createSharer({
            showMessage: text => messages.push(text),
            navigator,
            isTouchScreen,
            showLink: link => shownLinks.push(link)
        });
        return { share: () => sharer('https://example.com/#v=1'), shownLinks };
    }

    it('copies the link on a computer and says so', async () => {
        const writeText = vi.fn(async () => {});
        const { share } = setUp({ navigator: { share: vi.fn(), clipboard: { writeText } } });
        await share();
        expect(writeText).toHaveBeenCalledWith('https://example.com/#v=1');
        expect(messages).toEqual(['Link copied. Send it to a friend to share this cube.']);
    });

    it('opens the share sheet on a touch screen', async () => {
        const shareSheet = vi.fn(async () => {});
        const writeText = vi.fn(async () => {});
        const { share } = setUp({ navigator: { share: shareSheet, clipboard: { writeText } }, isTouchScreen: () => true });
        await share();
        expect(shareSheet).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://example.com/#v=1' }));
        expect(writeText).not.toHaveBeenCalled();
    });

    it('does nothing more when the share sheet is closed', async () => {
        const cancelled = Object.assign(new Error('Share canceled'), { name: 'AbortError' });
        const writeText = vi.fn(async () => {});
        const { share } = setUp({
            navigator: { share: vi.fn(async () => { throw cancelled; }), clipboard: { writeText } },
            isTouchScreen: () => true
        });
        await share();
        expect(writeText).not.toHaveBeenCalled();
        expect(messages).toEqual([]);
    });

    it('copies the link instead when the share sheet fails', async () => {
        const writeText = vi.fn(async () => {});
        const { share } = setUp({
            navigator: { share: vi.fn(async () => { throw new Error('Not allowed'); }), clipboard: { writeText } },
            isTouchScreen: () => true
        });
        await share();
        expect(writeText).toHaveBeenCalled();
    });

    it('copies on a touch screen without a share sheet', async () => {
        const writeText = vi.fn(async () => {});
        const { share } = setUp({ navigator: { clipboard: { writeText } }, isTouchScreen: () => true });
        await share();
        expect(writeText).toHaveBeenCalled();
    });

    it('shows the link to copy by hand when copying is not allowed', async () => {
        const { share, shownLinks } = setUp({ navigator: {} });
        await share();
        expect(shownLinks).toEqual(['https://example.com/#v=1']);
        expect(messages).toEqual([]);
    });


    it("uses the browser's own share sheet, clipboard and prompt by default", async () => {
        const prompt = vi.fn(() => null);
        window.prompt = prompt; // The simulated page has no prompt of its own
        const share = createSharer({ showMessage: () => {} });
        Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: undefined });
        try {
            await share('link');
            expect(prompt).toHaveBeenCalledWith('Copy this link to share your cube:', 'link');
        } finally {
            delete window.navigator.clipboard;
            delete window.prompt;
        }
    });
});

describe('setUpShareButton', () => {
    it('shares the current link when the button is clicked', () => {
        const share = vi.fn();
        let link = 'first';
        setUpShareButton({ getLink: () => link, share });
        link = 'second';
        document.querySelector('#share-button').click();
        expect(share).toHaveBeenCalledWith('second');
    });
});

describe('openLinkedCube', () => {
    function open(cube, hash, { confirm = () => true, beforeOpen = () => {} } = {}) {
        const location = { ...PAGE, hash };
        const history = { replaceState: vi.fn() };
        const opened = openLinkedCube({ cube, showMessage: text => messages.push(text), beforeOpen, location, history, confirm });
        return { opened, history };
    }

    it('does nothing when the address has no cube', () => {
        const cube = new Cube();
        const { opened, history } = open(cube, '');
        expect(opened).toBeNull();
        expect(history.replaceState).not.toHaveBeenCalled();
    });

    it('opens exactly the shared cube, and takes the link out of the address', () => {
        const friend = new Cube();
        friend.scramble(seededRandom(7));
        friend.move('R');

        const cube = new Cube();
        const beforeOpen = vi.fn();
        const { opened, history } = open(cube, hashOf(shareLink(friend, PAGE)), { beforeOpen });

        expect(opened).toEqual({ solution: null });
        expect(beforeOpen).toHaveBeenCalled();
        expect(history.replaceState).toHaveBeenCalledWith(null, '', '/cube/');
        expect(cube.state.toString()).toBe(friend.state.toString());
        expect(readFacelets(cube.model)).toBe(friend.state.toString());
        expect(cube.history).toEqual(friend.history);
        expect(cube.lastScramble).toBe(friend.lastScramble);
        // The friend's solve starts now
        expect(cube.currentSolve).toEqual({ moveCount: 0 });
    });

    it('opens a shared copied cube as a copied cube', () => {
        const friend = new Cube();
        friend.loadState(new CubeState().applyMoves(parseMoves("F R'")).toString());

        const cube = new Cube();
        open(cube, hashOf(shareLink(friend, PAGE)));
        expect(cube.startsFromCopy).toBe(true);
        expect(cube.state.toString()).toBe(friend.state.toString());
    });

    it('asks before replacing a cube with progress, and keeps it if the answer is no', () => {
        const friend = new Cube();
        friend.move('F');
        const cube = new Cube();
        cube.move('R');

        const confirm = vi.fn(() => false);
        const { opened } = open(cube, hashOf(shareLink(friend, PAGE)), { confirm });
        expect(confirm).toHaveBeenCalled();
        expect(opened).toBeNull();
        expect(cube.history).toEqual(parseMoves('R'));
    });

    it("doesn't ask when the cube has no progress, or is already the shared one", () => {
        const friend = new Cube();
        friend.move('F');
        const confirm = vi.fn(() => false);

        expect(open(new Cube(), hashOf(shareLink(friend, PAGE)), { confirm }).opened).not.toBeNull();

        const same = new Cube();
        same.move('F');
        expect(open(same, hashOf(shareLink(friend, PAGE)), { confirm }).opened).not.toBeNull();
        expect(confirm).not.toHaveBeenCalled();
    });

    it('says so when the link is broken, and leaves the cube alone', () => {
        const cube = new Cube();
        cube.move('R');
        const { opened, history } = open(cube, '#v=1&moves=RXQ');
        expect(opened).toBeNull();
        expect(history.replaceState).toHaveBeenCalled();
        expect(messages).toHaveLength(1);
        expect(cube.history).toEqual(parseMoves('R'));
    });

    it("uses the page's own address, history and confirm by default", () => {
        window.history.replaceState(null, '', '/#v=1&moves=R');
        const cube = new Cube();
        expect(openLinkedCube({ cube, showMessage: () => {} })).toEqual({ solution: null });
        expect(window.location.hash).toBe('');

        const confirm = vi.fn(() => false);
        window.confirm = confirm; // The simulated page has no confirm of its own
        try {
            window.history.replaceState(null, '', '/#v=1&moves=F');
            expect(openLinkedCube({ cube, showMessage: () => {} })).toBeNull();
            expect(confirm).toHaveBeenCalled();
        } finally {
            delete window.confirm;
        }
    });

    it('opens a cube with its solution, ready to play', () => {
        const friend = new Cube();
        friend.move("R U F'");
        const solution = solveCube(friend.state.facelets);

        const cube = new Cube();
        const { opened } = open(cube, hashOf(solutionLink(friend.snapshot(), solution, PAGE)));
        expect(opened.solution.moves).toEqual(solution.moves);
        expect(opened.solution.stages.map(stage => stage.moves)).toEqual(solution.stages.map(stage => stage.moves));
        expect(cube.state.toString()).toBe(friend.state.toString());
    });

    it("opens only the cube when its solution doesn't solve it", () => {
        const friend = new Cube();
        friend.move('R');
        const wrong = { stages: solveCube(friend.state.facelets).stages.map(stage => ({ ...stage, moves: [] })), moves: [] };
        wrong.stages[0].moves = [{ face: 'U', turns: 1 }];
        wrong.moves = [{ face: 'U', turns: 1 }];

        const cube = new Cube();
        const { opened } = open(cube, hashOf(solutionLink(friend.snapshot(), wrong, PAGE)));
        expect(opened).toEqual({ solution: null });
        expect(messages).toHaveLength(1);
        expect(cube.history).toEqual(parseMoves('R'));
    });

    it("uses the page's own address for a solution link by default", () => {
        const cube = new Cube();
        cube.move('R');
        const link = solutionLink(cube.snapshot(), solveCube(cube.state.facelets));
        expect(link.startsWith(`${window.location.origin}${window.location.pathname}#v=1&moves=R&solution=`)).toBe(true);
    });
});
