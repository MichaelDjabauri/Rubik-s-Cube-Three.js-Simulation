import { SOLVED } from './CubeState.js';

// The center sticker of each face, in CubeState's layout
const CENTERS = [4, 13, 22, 31, 40, 49];

// A cube being painted in the editor: 54 stickers in CubeState's layout, each a face letter
// or null when not painted yet. The 6 centers always keep their colors, since they define which face is which.
class CubeDraft {
    // A blank cube, with only the centers painted
    constructor() {
        this.facelets = [...SOLVED].map((sticker, index) => (CENTERS.includes(index) ? sticker : null));
    }

    isCenter(index) {
        return CENTERS.includes(index);
    }

    // Paints one sticker with a face letter. Returns whether anything changed; centers never change.
    paint(index, face) {
        return this.setSticker(index, face);
    }

    // Clears one sticker back to unpainted, but only if it has the given color, so an erasing
    // stroke started on one color never wipes out others. Returns whether anything changed.
    erase(index, face) {
        return this.facelets[index] === face && this.setSticker(index, null);
    }

    count(face) {
        return this.facelets.filter(sticker => sticker === face).length;
    }

    // Whether anything besides the centers has been painted
    get hasPaint() {
        return this.facelets.some((sticker, index) => sticker !== null && !this.isCenter(index));
    }

    setSticker(index, value) {
        if (this.isCenter(index) || this.facelets[index] === value) {
            return false;
        }
        this.facelets[index] = value;
        return true;
    }
}

export default CubeDraft;
