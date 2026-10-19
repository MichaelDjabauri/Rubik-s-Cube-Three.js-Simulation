import * as THREE from 'three';

const FOV_DEGREES = 75;
const START_POSITION = new THREE.Vector3(3, 3, 5);

// The camera's starting distance from the cube. Screens wide enough to fit the cube keep it.
export const DEFAULT_DISTANCE = START_POSITION.length();

// The direction the camera starts out looking from, as [x, y, z]: front, right and a little above.
// Double-clicking the view swings the camera back here.
export const START_VIEW = START_POSITION.toArray();

// The smallest share of the screen height the cube is ever fitted into
const MIN_FREE_FRACTION = 0.25;

// Distance from the cube's center to a corner: the radius of a ball that always contains the cube
export const CUBE_RADIUS = 1.5 * Math.sqrt(3);

export function createCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;

    const camera = new THREE.PerspectiveCamera(FOV_DEGREES, aspect, near, far);
    camera.position.copy(START_POSITION);

    return camera;
}

// Works out where the camera needs to be for the whole cube to fit on screen.
//
// width, height: the screen size in pixels.
// freeTop, freeBottom: the part of the screen, in pixels from the top, that isn't covered by buttons
//   or text. The cube is fitted into that space and centered in it. Defaults to the whole screen.
// margin: extra room around the cube, as a factor.
// The cube always gets at least a quarter of the screen height, even if buttons and text overlap
// on a tiny screen; otherwise the distance would come out infinite or negative.
//
// Returns { distance, offsetY }: how far the camera should be from the cube's center, and how many
// pixels to shift the view down (for camera.setViewOffset) so the cube sits in the middle of the free space.
export function fitCamera({ fovDegrees, width, height, freeTop = 0, freeBottom = height, margin = 1.08, minDistance = DEFAULT_DISTANCE }) {
    const tanHalfVertical = Math.tan(THREE.MathUtils.degToRad(fovDegrees) / 2);

    const freeHeight = Math.max(freeBottom - freeTop, height * MIN_FREE_FRACTION);

    // Half the viewing angle across the free space, vertically and horizontally
    const halfVertical = Math.atan(tanHalfVertical * freeHeight / height);
    const halfHorizontal = Math.atan(tanHalfVertical * width / height);

    // A ball fits when the narrower of the two angles still reaches its edge
    const fitted = CUBE_RADIUS * margin / Math.sin(Math.min(halfVertical, halfHorizontal));

    return {
        distance: Math.max(fitted, minDistance),
        offsetY: height / 2 - (freeTop + freeBottom) / 2
    };
}
