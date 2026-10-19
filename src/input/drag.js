import { FACES } from '../cube/faces.js';

// The math behind turning a layer by dragging a sticker. It uses plain [x, y, z] arrays and
// has no browser or 3D code, so it can be tested on its own. mouse.js connects it to the screen.

// The four unit directions lying flat on a face whose outward normal is `normal`,
// e.g. for the front face (+z): +x, -x, +y and -y
export function inPlaneAxes(normal) {
    const axes = [];
    for (let axis = 0; axis < 3; axis++) {
        if (normal[axis] !== 0) {
            continue;
        }
        for (const sign of [1, -1]) {
            const direction = [0, 0, 0];
            direction[axis] = sign;
            axes.push(direction);
        }
    }
    return axes;
}

// Picks the candidate whose on-screen direction best matches the drag.
// drag: [dx, dy] in pixels. candidates: [{ axis: [x, y, z], screen: [dx, dy] }].
// Returns that candidate's axis.
export function closestAxis(drag, candidates) {
    let best = null;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
        // Cosine of the angle between the two directions: 1 means exactly the same way
        const score = dot2(drag, candidate.screen) / (length2(drag) * length2(candidate.screen));
        if (score > bestScore) {
            best = candidate.axis;
            bestScore = score;
        }
    }

    return best;
}

// The move for grabbing the sticker at grid cell `cell` on the face pointing along `normal`,
// then dragging it in direction `dragAxis` (one of that face's inPlaneAxes).
// Returns notation like "U'", or null when the drag would turn a middle layer, which isn't supported yet.
export function moveForDrag(normal, cell, dragAxis) {
    // Rotating around normal × dragAxis is what carries the grabbed sticker along dragAxis
    const rotationAxis = cross(normal, dragAxis);

    // Which of the three layers along that axis the grabbed sticker is in: -1, 0 (middle) or 1
    const layer = dot3(cell, rotationAxis);
    if (layer === 0) {
        return null;
    }

    // The outer face of that layer
    const faceNormal = rotationAxis.map(value => value * layer);
    const face = FACES.find(candidate => candidate.normal.toArray().every((value, i) => value === faceNormal[i]));

    // The turn is a positive rotation around rotationAxis. If the face points the same way as that axis,
    // a positive rotation looks counterclockwise from outside the face, so it's a prime move.
    return layer > 0 ? `${face.notation}'` : face.notation;
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function dot3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function dot2(a, b) {
    return a[0] * b[0] + a[1] * b[1];
}

function length2(a) {
    return Math.hypot(a[0], a[1]);
}
