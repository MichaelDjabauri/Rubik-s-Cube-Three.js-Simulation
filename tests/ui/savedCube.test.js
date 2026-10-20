import { describe, it, expect } from 'vitest';
import { createCubeMemory } from '../../src/ui/savedCube.js';
import Cube from '../../src/cube/Cube.js';

// A stand-in for the browser's localStorage
function memoryStorage() {
    const values = new Map();
    return {
        values,
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key)
    };
}

const brokenStorage = {
    getItem() {
        throw new Error('Storage is disabled');
    },
    setItem() {
        throw new Error('Storage is disabled');
    }
};

describe('createCubeMemory', () => {
    it('saves the cube and loads it back as a snapshot', () => {
        const storage = memoryStorage();
        const memory = createCubeMemory({ storage });
        const cube = new Cube();
        cube.move("R U'");

        memory.saveCube(cube);
        expect(storage.values.get('rubiks-cube.cube')).toBe('v=1&moves=RU%27');
        expect(memory.loadCube()).toEqual({ ...cube.snapshot(), solution: null });
    });

    it('loads nothing when nothing was saved, or the saved text is damaged', () => {
        const storage = memoryStorage();
        const memory = createCubeMemory({ storage });
        expect(memory.loadCube()).toBeNull();

        storage.setItem('rubiks-cube.cube', 'v=1&moves=nonsense');
        expect(memory.loadCube()).toBeNull();
    });

    it('saves and loads the editor draft', () => {
        const memory = createCubeMemory({ storage: memoryStorage() });
        expect(memory.loadDraft()).toBeNull();
        memory.saveDraft('some draft');
        expect(memory.loadDraft()).toBe('some draft');
    });

    it('remembers nothing, without errors, when the browser refuses storage', () => {
        const memory = createCubeMemory({ storage: brokenStorage });
        memory.saveCube(new Cube());
        memory.saveDraft('some draft');
        expect(memory.loadCube()).toBeNull();
        expect(memory.loadDraft()).toBeNull();
    });
});
