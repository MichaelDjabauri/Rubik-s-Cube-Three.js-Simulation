import * as THREE from 'three';

class RotationHandler{
    constructor (scene, rubiksCube){
        this.scene = scene;
        this.rubiksCube = rubiksCube;
    }

    rotateWhiteFace(direction) {
        const subCubesToRotate = this.GetCubesOnWhiteFace();
        const rotationAxis = new THREE.Vector3(0, 0, 1);
        const angle = (direction === 'clockwise') ? -Math.PI / 2 : Math.PI / 2;
        const rotationSpeed = 0.1;
        let currentRotation = 0;

        // Create a temporary group to rotate the cubes together
        const group = new THREE.Group();
        subCubesToRotate.forEach(subCube => group.add(subCube));
        this.scene.add(group);

        // Animation function for rotation
        const animateRotation = () => {
            if (!this.IsRotationComplete(currentRotation, angle)) {
                const step = rotationSpeed * Math.sign(angle);
                currentRotation += step;
                group.rotateOnAxis(rotationAxis, step);
                requestAnimationFrame(animateRotation);
            } else {
                completeRotation();
            }
        };

        // Finalize rotation and apply to cubes
        const completeRotation = () => {
            group.rotateOnAxis(rotationAxis, angle - currentRotation);
            group.updateMatrixWorld(true);

            subCubesToRotate.forEach(subCube => {
                subCube.applyMatrix4(group.matrixWorld);
                this.scene.add(subCube);
            });

            this.scene.remove(group);
        };

        animateRotation();
    }

    IsRotationComplete(currentRotation, angle) {
        const currentAngle = Math.abs(currentRotation);
        const desiredAngle = Math.abs(angle);
        const isRotationComplete = currentAngle >= desiredAngle;

        return isRotationComplete;
    }

    GetCubesOnWhiteFace() {
        const cubesOnWhiteFace = [];

        this.rubiksCube.allSubCubes.forEach(subCube => {
            if (subCube.position.z == 1) {
                cubesOnWhiteFace.push(subCube);
            }
        })

        return cubesOnWhiteFace;
    }
}

export default RotationHandler;