import * as THREE from 'three';

class RotationHandler {
    constructor(scene, rubiksCube) {
        this.scene = scene;
        this.rubiksCube = rubiksCube;
        this.rotationAxes = this.getRotationAxes()
        this.angles = this.getAngles()
        this.faceColors = this.getFaceColors();
        this.TURN_DURATION_S = 0.2;
        this.FLOAT_ERROR = 0.01;

        // Turns requested while another one is animating wait here
        this.turnQueue = [];
        this.currentTurn = null;

        // The turning layer is attached to this pivot at the cube's center and rotated as one group
        this.pivot = new THREE.Object3D();
        this.scene.add(this.pivot);
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
        this.turnQueue.push({ direction, faceColor });
    }

    // Called every frame from the render loop with the seconds since the last frame
    update(deltaSeconds) {
        if (!this.currentTurn) {
            if (this.turnQueue.length === 0) {
                return;
            }
            this.startTurn(this.turnQueue.shift());
        }

        const turn = this.currentTurn;
        turn.elapsed = Math.min(turn.elapsed + deltaSeconds, this.TURN_DURATION_S);
        const progress = turn.elapsed / this.TURN_DURATION_S;
        this.pivot.setRotationFromAxisAngle(turn.axis, turn.angle * this.easeInOut(progress));

        if (progress === 1) {
            this.completeTurn();
        }
    }

    startTurn({ direction, faceColor }) {
        this.pivot.rotation.set(0, 0, 0);
        const subCubes = this.getSubCubesToRotate(faceColor);
        // attach() keeps each sub cube where it is in the world while making it a child of the pivot
        subCubes.forEach(subCube => this.pivot.attach(subCube));

        this.currentTurn = {
            subCubes,
            axis: this.getRotationAxis(faceColor),
            angle: this.getRotationAngle(direction),
            elapsed: 0
        };
    }

    completeTurn() {
        this.currentTurn.subCubes.forEach(subCube => {
            this.scene.attach(subCube);
            this.snapToGrid(subCube);
        });
        this.pivot.rotation.set(0, 0, 0);
        this.currentTurn = null;
    }

    // Removes floating point error so it can't build up over many turns
    snapToGrid(subCube) {
        subCube.position.round();

        // After quarter turns, every entry of a sub cube's rotation matrix is exactly -1, 0 or 1
        const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(subCube.quaternion);
        rotationMatrix.elements = rotationMatrix.elements.map(Math.round);
        subCube.quaternion.setFromRotationMatrix(rotationMatrix);
    }

    easeInOut(t) {
        return t * t * (3 - 2 * t);
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