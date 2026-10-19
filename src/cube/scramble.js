const FACE_LETTERS = ['U', 'D', 'F', 'B', 'R', 'L'];
const SUFFIXES = ['', "'", '2'];

// Opposite faces turn around the same axis
const AXIS = { U: 'y', D: 'y', F: 'z', B: 'z', R: 'x', L: 'x' };

// A random scramble in notation, e.g. "R U2 F' ...", following the rules competitions used
// for random-move scrambles: never the same face twice in a row (R R' cancels out), and never
// three moves on the same axis in a row (R L R partly cancels out).
// `random` returns a number from 0 up to 1, like Math.random; tests pass a seeded one.
export function generateScramble(length = 25, random = Math.random) {
    const faces = [];

    while (faces.length < length) {
        const face = FACE_LETTERS[Math.floor(random() * FACE_LETTERS.length)];
        const previous = faces.at(-1);
        const beforeThat = faces.at(-2);

        const sameFaceAgain = face === previous;
        const thirdOnSameAxis = previous && beforeThat
            && AXIS[face] === AXIS[previous] && AXIS[face] === AXIS[beforeThat];

        if (!sameFaceAgain && !thirdOnSameAxis) {
            faces.push(face);
        }
    }

    return faces.map(face => face + SUFFIXES[Math.floor(random() * SUFFIXES.length)]).join(' ');
}
