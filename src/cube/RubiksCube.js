import * as THREE from 'three';
import { FACES } from './faces.js';
import { faceletIndex } from './CubeState.js';

// Slightly smaller than the 1-unit grid spacing so the gaps between cubelets show
const CUBELET_SIZE = 0.95;
// The soft glow added to stickers or cubelets to point them out, e.g. while hovering a face's button
export const HIGHLIGHT_GLOW = 0x444444;
// The color of a sticker that hasn't been painted yet in the cube editor
const UNPAINTED_COLOR = '#707070';

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
                    // Each cubelet gets its own materials so it can be recolored and highlighted on its own.
                    const materials = FACES.map(face => new THREE.MeshPhongMaterial({
                        color: position.dot(face.normal) === 1 ? face.hex : '#000000'
                    }));

                    const cubelet = new THREE.Mesh(geometry, materials);
                    cubelet.position.copy(position);
                    cubelet.userData.home = position.clone();
                    this.add(cubelet);
                    this.cubelets.push(cubelet);
                }
            }
        }
    }

    // Shows any cube: puts every cubelet back where it started, unrotated, then colors each
    // sticker from 54 face letters in CubeState's layout. null leaves a sticker grey (unpainted).
    // Only call this while no turn is animating.
    setStickers(facelets) {
        for (const cubelet of this.cubelets) {
            cubelet.position.copy(cubelet.userData.home);
            cubelet.quaternion.identity();
        }

        this.forEachSticker((material, index) => {
            const face = FACES.find(candidate => candidate.notation === facelets[index]);
            material.color.set(face ? face.hex : UNPAINTED_COLOR);
        });
    }

    // Makes the given stickers (indices in CubeState's layout) glow, on top of any glow already set
    highlightStickers(indices, glow = HIGHLIGHT_GLOW) {
        const wanted = new Set(indices);
        this.forEachSticker((material, index) => {
            if (wanted.has(index)) {
                material.emissive.setHex(glow);
            }
        });
    }

    // Makes the cubelets on one face glow softly, e.g. 'U'. Pass null to remove the glow.
    highlightFace(notation) {
        this.clearHighlights();
        const face = FACES.find(candidate => candidate.notation === notation);
        if (!face) {
            return;
        }

        for (const cubelet of this.cubelets) {
            if (cubelet.position.dot(face.normal) > 0.5) {
                cubelet.material.forEach(material => material.emissive.setHex(HIGHLIGHT_GLOW));
            }
        }
    }

    clearHighlights() {
        for (const cubelet of this.cubelets) {
            cubelet.material.forEach(material => material.emissive.setHex(0x000000));
        }
    }

    // Calls back with each visible sticker's material and its index in CubeState's layout,
    // wherever the cubelets have been turned to. Only valid while no turn is animating.
    forEachSticker(callback) {
        for (const cubelet of this.cubelets) {
            cubelet.material.forEach((material, side) => {
                // Side i of a cubelet started out pointing along FACES[i].normal; this is where it points now
                const direction = FACES[side].normal.clone().applyQuaternion(cubelet.quaternion).round();
                if (cubelet.position.dot(direction) !== 1) {
                    return; // An inner side, hidden inside the cube
                }
                callback(material, faceletIndex(cubelet.position.toArray(), direction.toArray()));
            });
        }
    }
}

export default RubiksCube;
