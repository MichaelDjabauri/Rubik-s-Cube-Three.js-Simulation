import { browserStorage, readSetting, writeSetting } from './storage.js';
import { encodeCube, decodeCube } from '../cube/cubeCode.js';

const CUBE_KEY = 'rubiks-cube.cube';
const DRAFT_KEY = 'rubiks-cube.draft';

// Remembers the cube (with its history) and the editor's draft in the browser, so a reload or a closed
// tab never loses a solve in progress or a half-painted cube.
//
// storage: normally the browser's localStorage (see storage.js). Without working storage nothing is
// remembered, and the app simply starts fresh each time.
export function createCubeMemory({ storage = browserStorage() } = {}) {
    return {
        saveCube(cube) {
            writeSetting(storage, CUBE_KEY, encodeCube(cube.snapshot()));
        },

        // The saved cube's snapshot, or null if there is none or it can't be read
        loadCube() {
            const text = readSetting(storage, CUBE_KEY);
            return text === null ? null : decodeCube(text);
        },

        // text: the draft as written by CubeDraft.toString
        saveDraft(text) {
            writeSetting(storage, DRAFT_KEY, text);
        },

        // The saved draft's text, or null. CubeDraft.fromString checks it.
        loadDraft() {
            return readSetting(storage, DRAFT_KEY);
        }
    };
}
