import * as THREE from 'three';
import { FACES } from './faces.js';

// Slightly smaller than the 1-unit grid spacing so the gaps between cubelets show
const CUBELET_SIZE = 0.95;
// The soft glow added to a face's cubelets to preview it, e.g. while hovering its button
const HIGHLIGHT_GLOW = 0x444444;

// A 3x3x3 cube centered on the origin, made of 26 cubelets at integer positions from -1 to 1
class RubiksCube extends THREE.Group {
    constructor() {
        super();

        const geometry = new THREE.BoxGeometry(CUBELET_SIZE, CUBELET_SIZE, CUBELET_SIZE);

        this.cubelets = [];

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    // The center position is hidden inside the cube, so no cubelet is needed there
                    if (x === 0 && y === 0 && z === 0) {
                        continue;
                    }

                    const position = new THREE.Vector3(x, y, z);

                    // A side gets its face's color only if it points out of the cube; inner sides are black.
                    // Each cubelet gets its own materials so it can be highlighted on its own.
                    const materials = FACES.map(face => new THREE.MeshPhongMaterial({
                        color: position.dot(face.normal) === 1 ? face.hex : '#000000'
                    }));

                    const cubelet = new THREE.Mesh(geometry, materials);
                    cubelet.position.copy(position);
                    this.add(cubelet);
                    this.cubelets.push(cubelet);
                }
            }
        }
    }

    // Makes the cubelets on one face glow softly, e.g. 'U'. Pass null to remove the glow.
    highlightFace(notation) {
        const face = FACES.find(candidate => candidate.notation === notation);

        for (const cubelet of this.cubelets) {
            const glows = face !== undefined && cubelet.position.dot(face.normal) > 0.5;
            cubelet.material.forEach(material => material.emissive.setHex(glows ? HIGHLIGHT_GLOW : 0x000000));
        }
    }
}

export default RubiksCube;
