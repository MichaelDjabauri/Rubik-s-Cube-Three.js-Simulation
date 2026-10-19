import * as THREE from 'three';

const FOV_DEGREES = 75;
const START_POSITION = new THREE.Vector3(3, 3, 5);

// The camera's starting distance from the cube. Screens wide enough to fit the cube keep it.
export const DEFAULT_DISTANCE = START_POSITION.length();

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
// freeHeight: how much of the screen, from the top, isn't covered by buttons. The cube is fitted
//   into that space and centered in it.
// margin: extra room around the cube, as a factor.
//
// Returns { distance, offsetY }: how far the camera should be from the cube's center, and how many
// pixels to shift the view down (for camera.setViewOffset) so the cube sits in the middle of the free space.
export function fitCamera({ fovDegrees, width, height, freeHeight = height, margin = 1.08, minDistance = DEFAULT_DISTANCE }) {
    const tanHalfVertical = Math.tan(THREE.MathUtils.degToRad(fovDegrees) / 2);

    // Half the viewing angle across the free space, vertically and horizontally
    const halfVertical = Math.atan(tanHalfVertical * freeHeight / height);
    const halfHorizontal = Math.atan(tanHalfVertical * width / height);

    // A ball fits when the narrower of the two angles still reaches its edge
    const fitted = CUBE_RADIUS * margin / Math.sin(Math.min(halfVertical, halfHorizontal));

    return {
        distance: Math.max(fitted, minDistance),
        offsetY: (height - freeHeight) / 2
    };
}
