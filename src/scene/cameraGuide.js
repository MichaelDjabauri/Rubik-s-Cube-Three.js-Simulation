import * as THREE from 'three';

const FLIGHT_DURATION_S = 0.45;

// Smoothly swings the camera around the cube to look at it from a new direction, keeping its distance.
// Used by the cube editor to show each face in turn. Call update() every frame, after controls.update(),
// so the guided camera wins over any leftover orbit motion.
export function createCameraGuide(camera, controls) {
    let flight = null;

    return {
        // direction: [x, y, z] from the cube's center towards where the camera should end up
        flyTo(direction) {
            const from = camera.position.clone().sub(controls.target).normalize();
            const to = new THREE.Vector3(...direction).normalize();
            flight = { from, rotation: new THREE.Quaternion().setFromUnitVectors(from, to), elapsed: 0 };
        },

        update(deltaSeconds) {
            if (!flight) {
                return;
            }
            flight.elapsed = Math.min(flight.elapsed + deltaSeconds, FLIGHT_DURATION_S);
            const t = flight.elapsed / FLIGHT_DURATION_S;
            const eased = t * t * (3 - 2 * t);

            // Turn the starting direction part of the way towards the target, along the shortest arc
            const partial = new THREE.Quaternion().slerp(flight.rotation, eased);
            const direction = flight.from.clone().applyQuaternion(partial);
            const distance = camera.position.distanceTo(controls.target);

            camera.position.copy(controls.target).addScaledVector(direction, distance);
            camera.lookAt(controls.target);

            if (t === 1) {
                flight = null;
            }
        }
    };
}
