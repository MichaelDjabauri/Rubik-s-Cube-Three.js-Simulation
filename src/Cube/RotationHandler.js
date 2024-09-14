import * as THREE from 'three';

class RotationHandler {
    constructor(scene, rubiksCube) {
        this.scene = scene;
        this.rubiksCube = rubiksCube;
        this.currentSubCubesToRotate = [];
        this.rotationAxes = this.getRotationAxes()
        this.angles = this.getAngles()
        this.faceColors = this.getFaceColors();
        this.INTERVAL_MS = 1;
        this.ROTATION_FRACTION = 0.05;
    }

    rotateWhiteFace(direction) {
        this.rotateFace(direction, this.faceColors.WHITE);
    }
    rotateYellowFace(direction) {
        this.rotateFace(direction, this.faceColors.YELLOW);
    }

    rotateFace(direction, faceColor) {
        this.currentSubCubesToRotate = this.getSubCubesToRotate(faceColor);
        const rotationAxis = this.getRotationAxis(faceColor);
        const angle = this.getRotationAngle(direction);
        this.currentRotation = 0;

        // Create a temporary group to rotate the cubes together
        const temporaryGroup = new THREE.Group();
        this.currentSubCubesToRotate.forEach(subCube => temporaryGroup.add(subCube));
        this.scene.add(temporaryGroup);

        const step = this.ROTATION_FRACTION * angle;
        const totalSteps = Math.abs(angle / step);
        let stepsCompleted = 0;

        const rotationInterval = setInterval(() => {
            if (stepsCompleted < totalSteps) {
                temporaryGroup.rotateOnAxis(rotationAxis, step);
                this.currentRotation += step;
                stepsCompleted++;
            } else {
                this.completeRotation(rotationInterval, temporaryGroup, rotationAxis, angle);
            }
        }, this.INTERVAL_MS);
    }

    getRotationAxis(faceColor) {
        if (faceColor === this.faceColors.WHITE || faceColor === this.faceColors.YELLOW) {
            return this.rotationAxes.z;
        }
    }

    getRotationAngle(direction) {
        return (direction === 'clockwise') ?
            this.angles.CLOCKWISE :
            this.angles.COUNTER_CLOCKWISE;
    }

    completeRotation(rotationInterval, group, rotationAxis, angle) {
        clearInterval(rotationInterval);
        group.rotateOnAxis(rotationAxis, angle - this.currentRotation);
        group.updateMatrixWorld(true);

        this.currentSubCubesToRotate.forEach(subCube => {
            subCube.applyMatrix4(group.matrixWorld);
            this.scene.add(subCube);
            group.remove(subCube);
        });

        this.scene.remove(group);
        this.currentSubCubesToRotate = [];
    }

    getSubCubesToRotate(faceColor) {
        const cubesOnGivenFace = [];
        if (faceColor === this.faceColors.WHITE) {
            this.rubiksCube.allSubCubes.forEach(subCube => {
                if (subCube.position.z == 1) {
                    cubesOnGivenFace.push(subCube);
                }
            });
        }
        if (faceColor === this.faceColors.YELLOW) {
            this.rubiksCube.allSubCubes.forEach(subCube => {
                if (subCube.position.z == -1) {
                    cubesOnGivenFace.push(subCube);
                }
            });
        }

        return cubesOnGivenFace;
    }

    getAngles() {
        return {
            CLOCKWISE: -Math.PI / 2,
            COUNTER_CLOCKWISE: Math.PI / 2
        };
    }

    getRotationAxes() {
        return {
            x: new THREE.Vector3(1, 0, 0),
            y: new THREE.Vector3(0, 1, 0),
            z: new THREE.Vector3(0, 0, 1)
        };
    }

    getFaceColors(){
        return {
            GREEN: 'green',
            BLUE: 'blue',
            RED: 'red',
            ORANGE: 'orange',
            WHITE: 'white',
            YELLOW: 'yellow'
        };
    }
}

export default RotationHandler;