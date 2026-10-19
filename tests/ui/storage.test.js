// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest';
import { browserStorage, readSetting, writeSetting } from '../../src/ui/storage.js';

const brokenStorage = {
    getItem() {
        throw new Error('Storage is disabled');
    },
    setItem() {
        throw new Error('Storage is disabled');
    },
    removeItem() {
        throw new Error('Storage is disabled');
    }
};

describe('settings storage', () => {
    it("reads, saves and forgets settings in the browser's storage", () => {
        const storage = browserStorage();
        expect(storage).toBe(window.localStorage);

        expect(readSetting(storage, 'test.key')).toBeNull();
        writeSetting(storage, 'test.key', 'yes');
        expect(readSetting(storage, 'test.key')).toBe('yes');
        writeSetting(storage, 'test.key', null);
        expect(readSetting(storage, 'test.key')).toBeNull();
    });

    it('does nothing, without errors, when there is no storage or it refuses to work', () => {
        for (const storage of [null, brokenStorage]) {
            expect(readSetting(storage, 'test.key')).toBeNull();
            expect(() => writeSetting(storage, 'test.key', 'yes')).not.toThrow();
            expect(() => writeSetting(storage, 'test.key', null)).not.toThrow();
        }
    });

    it('gives no storage when the browser blocks it for the whole page', () => {
        const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() {
                throw new Error('Access to storage is denied');
            }
        });
        try {
            expect(browserStorage()).toBeNull();
        } finally {
            Object.defineProperty(window, 'localStorage', original);
        }
    });
});
