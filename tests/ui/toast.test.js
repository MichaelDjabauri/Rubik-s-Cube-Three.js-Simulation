// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createToast } from '../../src/ui/toast.js';

beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="toast" hidden></div>';
});

afterEach(() => {
    vi.useRealTimers();
});

describe('createToast', () => {
    it('shows a message for a few seconds', () => {
        const toast = createToast();
        toast.show('Link copied');
        const element = document.querySelector('#toast');
        expect(element.hidden).toBe(false);
        expect(element.textContent).toBe('Link copied');

        vi.advanceTimersByTime(3000);
        expect(element.hidden).toBe(true);
    });

    it('gives a new message the full time', () => {
        const toast = createToast();
        toast.show('First');
        vi.advanceTimersByTime(2000);
        toast.show('Second');
        vi.advanceTimersByTime(2000);
        expect(document.querySelector('#toast').hidden).toBe(false);
        vi.advanceTimersByTime(1000);
        expect(document.querySelector('#toast').hidden).toBe(true);
    });
});
