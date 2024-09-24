import * as THREE from 'three';

class RubiksCube {
    constructor() {
        this.setMaterials();
        this.setBoxGeometry();
        this.createSubCubes();
    }

    createSubCubes() {
        this.createCornerSubCubes();
        this.createEdgeSubCubes();
        this.createFaceSubCubes();
        this.allSubCubes = this.getAllSubCubes();
    }
    
    createCornerSubCubes() {
        let cornerWhiteRedGreenPosition = { x: 1, y: 1, z: 1 };
        let colorsToFill = [this.colorIndices.white, this.colorIndices.red, this.colorIndices.green];
        this.cornerWhiteRedGreen = this.initializeSubCube(cornerWhiteRedGreenPosition, colorsToFill);

        let cornerWhiteGreenOrangePosition = { x: 1, y: -1, z: 1 };
        colorsToFill = [this.colorIndices.white, this.colorIndices.green, this.colorIndices.orange];
        this.cornerWhiteGreenOrange = this.initializeSubCube(cornerWhiteGreenOrangePosition, colorsToFill);

        let cornerWhiteOrangeBluePosition = { x: -1, y: -1, z: 1 };
        colorsToFill = [this.colorIndices.white, this.colorIndices.orange, this.colorIndices.blue];
        this.cornerWhiteOrangeBlue = this.initializeSubCube(cornerWhiteOrangeBluePosition, colorsToFill);

        let cornerWhiteBlueRedPosition = { x: -1, y: 1, z: 1 };
        colorsToFill = [this.colorIndices.white, this.colorIndices.blue, this.colorIndices.red];
        this.cornerWhiteBlueRed = this.initializeSubCube(cornerWhiteBlueRedPosition, colorsToFill);

        let cornerYellowRedBluePosition = { x: -1, y: 1, z: -1 };
        colorsToFill = [this.colorIndices.yellow, this.colorIndices.red, this.colorIndices.blue];
        this.cornerYellowRedBlue = this.initializeSubCube(cornerYellowRedBluePosition, colorsToFill);

        let cornerYellowBlueOrangePosition = { x: -1, y: -1, z: -1 };
        colorsToFill = [this.colorIndices.yellow, this.colorIndices.blue, this.colorIndices.orange];
        this.cornerYellowBlueOrange = this.initializeSubCube(cornerYellowBlueOrangePosition, colorsToFill);

        let cornerYellowOrangeGreenPosition = { x: 1, y: -1, z: -1 };
        colorsToFill = [this.colorIndices.yellow, this.colorIndices.orange, this.colorIndices.green];
        this.cornerYellowOrangeGreen = this.initializeSubCube(cornerYellowOrangeGreenPosition, colorsToFill);

        let cornerYellowGreenRedPosition = { x: 1, y: 1, z: -1 };
        colorsToFill = [this.colorIndices.yellow, this.colorIndices.green, this.colorIndices.red];
        this.cornerYellowGreenRed = this.initializeSubCube(cornerYellowGreenRedPosition, colorsToFill);
    }

    createEdgeSubCubes() {
        let edgeWhiteGreenPosition = { x: 1, y: 0, z: 1 };
        let colorsToFill = [this.colorIndices.white, this.colorIndices.green];
        this.edgeWhiteGreen = this.initializeSubCube(edgeWhiteGreenPosition, colorsToFill);

        let edgeWhiteOrangePosition = { x: 0, y: -1, z: 1 };
        colorsToFill = [this.colorIndices.white, this.colorIndices.orange];
        this.edgeWhiteOrange = this.initializeSubCube(edgeWhiteOrangePosition, colorsToFill);

        let edgeWhiteBluePosition = { x: -1, y: 0, z: 1 };
        colorsToFill = [this.colorIndices.white, this.colorIndices.blue];
        this.edgeWhiteBlue = this.initializeSubCube(edgeWhiteBluePosition, colorsToFill);

        let edgeWhiteRedPosition = { x: 0, y: 1, z: 1 };
        colorsToFill = [this.colorIndices.white, this.colorIndices.red];
        this.edgeWhiteRed = this.initializeSubCube(edgeWhiteRedPosition, colorsToFill);

        let edgeYellowBluePosition = { x: -1, y: 0, z: -1 };
        colorsToFill = [this.colorIndices.yellow, this.colorIndices.blue];
        this.edgeYellowBlue = this.initializeSubCube(edgeYellowBluePosition, colorsToFill);

        let edgeYellowOrangePosition = { x: 0, y: -1, z: -1 };
        colorsToFill = [this.colorIndices.yellow, this.colorIndices.orange];
        this.edgeYellowOrange = this.initializeSubCube(edgeYellowOrangePosition, colorsToFill);

        let edgeYellowGreenPosition = { x: 1, y: 0, z: -1 };
        colorsToFill = [this.colorIndices.yellow, this.colorIndices.green];
        this.edgeYellowGreen = this.initializeSubCube(edgeYellowGreenPosition, colorsToFill);

        let edgeYellowRedPosition = { x: 0, y: 1, z: -1 };
        colorsToFill = [this.colorIndices.yellow, this.colorIndices.red];
        this.edgeYellowRed = this.initializeSubCube(edgeYellowRedPosition, colorsToFill);

        let edgeRedGreenPosition = { x: 1, y: 1, z: 0 };
        colorsToFill = [this.colorIndices.red, this.colorIndices.green];
        this.edgeRedGreen = this.initializeSubCube(edgeRedGreenPosition, colorsToFill);

        let edgeRedBluePosition = { x: -1, y: 1, z: 0 };
        colorsToFill = [this.colorIndices.red, this.colorIndices.blue];
        this.edgeRedBlue = this.initializeSubCube(edgeRedBluePosition, colorsToFill);

        let edgeOrangeGreenPosition = { x: 1, y: -1, z: 0 };
        colorsToFill = [this.colorIndices.orange, this.colorIndices.green];
        this.edgeOrangeGreen = this.initializeSubCube(edgeOrangeGreenPosition, colorsToFill);

        let edgeOrangeBluePosition = { x: -1, y: -1, z: 0 };
        colorsToFill = [this.colorIndices.orange, this.colorIndices.blue];
        this.edgeOrangeBlue = this.initializeSubCube(edgeOrangeBluePosition, colorsToFill);
    }

    createFaceSubCubes() {
        let faceWhitePosition = { x: 0, y: 0, z: 1 };
        let colorsToFill = [this.colorIndices.white];
        this.faceWhite = this.initializeSubCube(faceWhitePosition, colorsToFill);

        let faceYellowPosition = { x: 0, y: 0, z: -1 };
        colorsToFill = [this.colorIndices.yellow];
        this.faceYellow = this.initializeSubCube(faceYellowPosition, colorsToFill);

        let faceRedPosition = { x: 0, y: 1, z: 0 };
        colorsToFill = [this.colorIndices.red];
        this.faceRed = this.initializeSubCube(faceRedPosition, colorsToFill);

        let faceOrangePosition = { x: 0, y: -1, z: 0 };
        colorsToFill = [this.colorIndices.orange];
        this.faceOrange = this.initializeSubCube(faceOrangePosition, colorsToFill);

        let faceGreenPosition = { x: 1, y: 0, z: 0 };
        colorsToFill = [this.colorIndices.green];
        this.faceGreen = this.initializeSubCube(faceGreenPosition, colorsToFill);

        let faceBluePosition = { x: -1, y: 0, z: 0 };
        colorsToFill = [this.colorIndices.blue];
        this.faceBlue = this.initializeSubCube(faceBluePosition, colorsToFill);
    }

    getAllSubCubes(){
        return [
            // Corner sub cubes
            this.cornerWhiteRedGreen,
            this.cornerWhiteGreenOrange,
            this.cornerWhiteOrangeBlue,
            this.cornerWhiteBlueRed,
            this.cornerYellowRedBlue,
            this.cornerYellowBlueOrange,
            this.cornerYellowOrangeGreen,
            this.cornerYellowGreenRed,

            // Edge sub cubes
            this.edgeWhiteGreen,
            this.edgeWhiteOrange,
            this.edgeWhiteBlue,
            this.edgeWhiteRed,
            this.edgeYellowBlue,
            this.edgeYellowOrange,
            this.edgeYellowGreen,
            this.edgeYellowRed,
            this.edgeRedGreen,
            this.edgeRedBlue,
            this.edgeOrangeGreen,
            this.edgeOrangeBlue,

            // FacE sub cubes
            this.faceWhite,
            this.faceYellow,
            this.faceRed,
            this.faceOrange,
            this.faceGreen,
            this.faceBlue
        ];
    }

    setMaterials() {
        this.colorIndices = {
            green: 0,   // Right
            blue: 1,    // Left
            red: 2,     // Top
            orange: 3,  // Bottom
            white: 4,   // Front
            yellow: 5   // Back
        };

        this.materials = [];

        this.materials[this.colorIndices.green] = new THREE.MeshPhongMaterial({ color: '#009b48' });
        this.materials[this.colorIndices.blue] = new THREE.MeshPhongMaterial({ color: '#0046ad' });
        this.materials[this.colorIndices.red] = new THREE.MeshPhongMaterial({ color: '#b71234' });
        this.materials[this.colorIndices.orange] = new THREE.MeshPhongMaterial({ color: '#ff5800' });
        this.materials[this.colorIndices.white] = new THREE.MeshPhongMaterial({ color: '#ffffff' });
        this.materials[this.colorIndices.yellow] = new THREE.MeshPhongMaterial({ color: '#ffd500' });

        this.blackMaterial = new THREE.MeshPhongMaterial({ color: '#000000' }); // Inside of cube
    }

    initializeSubCube(position, colorIndeciesToFill) {
        let materials = this.getCustomMaterials(colorIndeciesToFill);
        let subCube = new THREE.Mesh(this.BoxGeometry, materials);
        subCube.position.set(position.x, position.y, position.z);

        return subCube;
    }

    getCustomMaterials(colorIndeciesToFill) {
        let customColoredMaterials = [];
        for (let colorIndex = 0; colorIndex < this.materials.length; colorIndex++) {
            if (colorIndeciesToFill.includes(colorIndex)) {
                // Visible face of sub cube
                customColoredMaterials[colorIndex] = this.materials[colorIndex];
            }
            else {
                // Face of the sub cube inside the Rubik's cube
                customColoredMaterials[colorIndex] = this.blackMaterial;
            }
        }

        return customColoredMaterials;
    }

    setBoxGeometry() {
        const sideLength = 0.95;

        const boxWidth = sideLength;
        const boxHeight = sideLength;
        const boxDepth = sideLength;

        this.BoxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    }
}

export default RubiksCube;