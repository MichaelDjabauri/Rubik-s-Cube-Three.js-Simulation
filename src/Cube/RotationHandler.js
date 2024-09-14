import * as THREE from 'three';

class RotationHandler{
    constructor (scene, rubiksCube){
        this.scene = scene;
        this.rubiksCube = rubiksCube;
        this.ANGLES = {
            clockwise : -Math.PI / 2,
            counterClockwise: Math.PI / 2
        }
        this.INTERVAL_MS = 1;
        this.ROTATION_FRACTION = 0.05;
        this.ROTATION_AXES = {
            x : new THREE.Vector3(1, 0, 0),
            y : new THREE.Vector3(0, 1, 0),
            z : new THREE.Vector3(0, 0, 1)
        }
    }

    rotateWhiteFace(direction) {
        const subCubesToRotate = this.GetCubesOnWhiteFace();
        const rotationAxis = this.ROTATION_AXES.z;
        const angle = this.getRotationAngle(direction);
        let currentRotation = 0;
    
        // Create a temporary group to rotate the cubes together
        const temporaryGroup = new THREE.Group();
        subCubesToRotate.forEach(subCube => temporaryGroup.add(subCube));
        this.scene.add(temporaryGroup);
    
        const step = this.ROTATION_FRACTION * Math.sign(angle);
        const totalSteps = Math.abs(angle / step);
        let stepsCompleted = 0;
    
        const rotationInterval = setInterval(() => {
            if (stepsCompleted < totalSteps) {
                temporaryGroup.rotateOnAxis(rotationAxis, step);
                currentRotation += step;
                stepsCompleted++;
            } else {
                this.completeRotation(rotationInterval, temporaryGroup, rotationAxis, angle, currentRotation, subCubesToRotate);
            }
        }, this.INTERVAL_MS); 
    }    

    getRotationAngle(direction) {
        return (direction === 'clockwise') ?
            this.ANGLES.clockwise :
            this.ANGLES.counterClockwise;
    }

    completeRotation(rotationInterval, group, rotationAxis, angle, currentRotation, subCubesToRotate) {
        clearInterval(rotationInterval);
        group.rotateOnAxis(rotationAxis, angle - currentRotation);
        group.updateMatrixWorld(true);

        subCubesToRotate.forEach(subCube => {
            subCube.applyMatrix4(group.matrixWorld);
            this.scene.add(subCube);
            group.remove(subCube);
        });

        this.scene.remove(group);
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