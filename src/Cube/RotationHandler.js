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
        this.FLOAT_ERROR = 0.01;
    }

    rotateWhiteFace(direction) {
        this.rotateFace(direction, this.faceColors.WHITE);
    }
    rotateYellowFace(direction) {
        this.rotateFace(direction, this.faceColors.YELLOW);
    }
    rotateGreenFace(direction) {
        this.rotateFace(direction, this.faceColors.GREEN);
    }
    rotateBlueFace(direction) {
        this.rotateFace(direction, this.faceColors.BLUE);
    }
    rotateRedFace(direction) {
        this.rotateFace(direction, this.faceColors.RED);
    }
    rotateOrangeFace(direction) {
        this.rotateFace(direction, this.faceColors.ORANGE);
    }

    rotateFace(direction, faceColor) {
        this.currentSubCubesToRotate = this.getSubCubesToRotate(faceColor);
        const rotationAxis = this.getRotationAxis(faceColor);
        const angle = this.getRotationAngle(direction);
        this.currentRotation = 0;
    
        // Get the center of the Rubik's cube (origin is assumed to be (0,0,0))
        const cubeCenter = new THREE.Vector3(0, 0, 0);
    
        // Calculate the step increment for rotation
        const step = this.ROTATION_FRACTION * angle;
        const totalSteps = Math.abs(angle / step);
        let stepsCompleted = 0;
    
        const rotationInterval = setInterval(() => {
            if (stepsCompleted < totalSteps) {
                // Rotate each subcube around the center of the Rubik's Cube
                this.currentSubCubesToRotate.forEach(subCube => {
                    this.rotateAroundPoint(subCube, cubeCenter, rotationAxis, step);
                });
                this.currentRotation += step;
                stepsCompleted++;
            } else {
                this.completeRotation(rotationInterval, rotationAxis, angle, cubeCenter);
            }
        }, this.INTERVAL_MS);
    }
    
    completeRotation(rotationInterval, rotationAxis, angle, cubeCenter) {
        clearInterval(rotationInterval);
        // Correct for any remaining rotation precision errors
        const correction = angle - this.currentRotation;
        this.currentSubCubesToRotate.forEach(subCube => {
            this.rotateAroundPoint(subCube, cubeCenter, rotationAxis, correction);
            // Apply final transformation to ensure it's updated correctly in world space
            subCube.updateMatrixWorld(true);
        });
    
        this.currentSubCubesToRotate = [];
    }
    
    rotateAroundPoint(object, point, axis, angle) {
        object.position.sub(point);
        object.position.applyAxisAngle(axis, angle);
        object.position.add(point);
        object.rotateOnWorldAxis(axis, angle);
    }    
    
    getRotationAxis(faceColor) {
        if (faceColor === this.faceColors.WHITE) {
            return this.rotationAxes.z;
        }
        if (faceColor === this.faceColors.GREEN) {
            return this.rotationAxes.x;
        }
        if (faceColor === this.faceColors.RED) {
            return this.rotationAxes.y;
        }
        if (faceColor === this.faceColors.YELLOW) {
            return this.rotationAxes.zp;
        }
        if (faceColor === this.faceColors.BLUE) {
            return this.rotationAxes.xp;
        }
        if (faceColor === this.faceColors.ORANGE) {
            return this.rotationAxes.yp;
        }
    }

    getRotationAngle(direction) {
        return (direction === 'clockwise') ?
            this.angles.CLOCKWISE :
            this.angles.COUNTER_CLOCKWISE;
    }

    getSubCubesToRotate(faceColor) {
        const cubesOnGivenFace = [];
        if (faceColor === this.faceColors.WHITE) {
            this.rubiksCube.allSubCubes.forEach(subCube => {
                if (this.aproximatelyEquals(subCube.position.z, 1)) {
                    cubesOnGivenFace.push(subCube);
                }
            });
        }
        if (faceColor === this.faceColors.YELLOW) {
            this.rubiksCube.allSubCubes.forEach(subCube => {
                if (this.aproximatelyEquals(subCube.position.z, -1)) {
                    cubesOnGivenFace.push(subCube);
                }
            });
        }
        if (faceColor === this.faceColors.GREEN) {
            this.rubiksCube.allSubCubes.forEach(subCube => {
                if (this.aproximatelyEquals(subCube.position.x, 1)) {
                    cubesOnGivenFace.push(subCube);
                }
            });
        }
        if (faceColor === this.faceColors.BLUE) {
            this.rubiksCube.allSubCubes.forEach(subCube => {
                if (this.aproximatelyEquals(subCube.position.x, -1)) {
                    cubesOnGivenFace.push(subCube);
                }
            });
        }
        if (faceColor === this.faceColors.RED) {
            this.rubiksCube.allSubCubes.forEach(subCube => {
                if (this.aproximatelyEquals(subCube.position.y, 1)) {
                    cubesOnGivenFace.push(subCube);
                }
            });
        }
        if (faceColor === this.faceColors.ORANGE) {
            this.rubiksCube.allSubCubes.forEach(subCube => {
                if (this.aproximatelyEquals(subCube.position.y, -1)) {
                    cubesOnGivenFace.push(subCube);
                }
            });
        }

        return cubesOnGivenFace;
    }

    aproximatelyEquals(floatA, floatB) {
        return Math.abs(floatA - floatB) < this.FLOAT_ERROR;
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
            z: new THREE.Vector3(0, 0, 1),
            xp: new THREE.Vector3(-1, 0, 0),
            yp: new THREE.Vector3(0, -1, 0),
            zp: new THREE.Vector3(0, 0, -1)
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