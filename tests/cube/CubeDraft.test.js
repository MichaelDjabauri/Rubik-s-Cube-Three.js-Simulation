import { describe, it, expect } from 'vitest';
import CubeDraft from '../../src/cube/CubeDraft.js';

describe('CubeDraft', () => {
    it('starts blank, with only the 6 centers painted', () => {
        const draft = new CubeDraft();
        expect(draft.facelets.filter(sticker => sticker !== null)).toEqual(['U', 'R', 'F', 'D', 'L', 'B']);
        expect(draft.count('F')).toBe(1);
        expect(draft.hasPaint).toBe(false);
    });

    it('paints a sticker and says whether anything changed', () => {
        const draft = new CubeDraft();
        expect(draft.paint(0, 'F')).toBe(true);
        expect(draft.paint(0, 'F')).toBe(false);
        expect(draft.facelets[0]).toBe('F');
        expect(draft.count('F')).toBe(2);
        expect(draft.hasPaint).toBe(true);
    });

    it('repaints a sticker with a different color', () => {
        const draft = new CubeDraft();
        draft.paint(0, 'F');
        expect(draft.paint(0, 'U')).toBe(true);
        expect(draft.facelets[0]).toBe('U');
    });

    it('erases a sticker only if it has the given color', () => {
        const draft = new CubeDraft();
        draft.paint(0, 'F');
        draft.paint(1, 'U');

        expect(draft.erase(1, 'F')).toBe(false); // Red, not white: left alone
        expect(draft.facelets[1]).toBe('U');
        expect(draft.erase(0, 'F')).toBe(true);
        expect(draft.facelets[0]).toBeNull();
        expect(draft.erase(0, 'F')).toBe(false); // Already blank
    });

    it('never changes a center', () => {
        const draft = new CubeDraft();
        expect(draft.isCenter(22)).toBe(true);
        expect(draft.isCenter(21)).toBe(false);
        expect(draft.paint(22, 'U')).toBe(false);
        expect(draft.erase(22, 'F')).toBe(false);
        expect(draft.facelets[22]).toBe('F');
    });
});
