import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FACES } from './faces.js';
import { faceletIndex } from './CubeState.js';

// Slightly smaller than the 1-unit grid spacing so the gaps between cubelets show
const CUBELET_SIZE = 0.95;
const CUBELET_ROUNDING = 0.08;
// Stickers are a bit smaller than a cubelet's side, so a black border shows around each one
const STICKER_SIZE = 0.82;
const STICKER_ROUNDING = 0.1;
const STICKER_THICKNESS = 0.012;
// The soft glow added to stickers to point them out, e.g. while hovering a face's button
export const HIGHLIGHT_GLOW = 0x444444;
// The color of a sticker that hasn't been painted yet in the cube editor
const UNPAINTED_COLOR = '#707070';

// A 3x3x3 cube centered on the origin, made of 26 cubelets at integer positions from -1 to 1.
// Each cubelet is a rounded black plastic body with a glossy sticker on every side that faces out.
class RubiksCube extends THREE.Group {
    constructor() {
        super();

        const bodyGeometry = new RoundedBoxGeometry(CUBELET_SIZE, CUBELET_SIZE, CUBELET_SIZE, 3, CUBELET_ROUNDING);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35 });
        const stickerGeometry = createStickerGeometry();

        this.cubelets = [];

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    // The center position is hidden inside the cube, so no cubelet is needed there
                    if (x === 0 && y === 0 && z === 0) {
                        continue;
                    }

                    const position = new THREE.Vector3(x, y, z);
                    const cubelet = new THREE.Mesh(bodyGeometry, bodyMaterial);
                    cubelet.castShadow = true;
                    cubelet.position.copy(position);
                    cubelet.userData.home = position.clone();

                    // A sticker on every side that points out of the cube. A cubelet's outer sides never
                    // change, only where they point as it turns. Each sticker gets its own material so it
                    // can be recolored and highlighted on its own.
                    cubelet.userData.stickers = [];
                    FACES.forEach((face, side) => {
                        if (position.dot(face.normal) !== 1) {
                            return;
                        }
                        const sticker = new THREE.Mesh(stickerGeometry, createStickerMaterial(face.hex));
                        sticker.userData.side = side;
                        // The sticker is drawn facing +z; turn it to face this side, just outside the body
                        sticker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), face.normal);
                        sticker.position.copy(face.normal).multiplyScalar(CUBELET_SIZE / 2);
                        cubelet.add(sticker);
                        cubelet.userData.stickers.push(sticker);
                    });

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

    // Makes the stickers on one face's cubelets glow softly, e.g. 'U'. Pass null to remove the glow.
    highlightFace(notation) {
        this.clearHighlights();
        const face = FACES.find(candidate => candidate.notation === notation);
        if (!face) {
            return;
        }

        for (const cubelet of this.cubelets) {
            if (cubelet.position.dot(face.normal) > 0.5) {
                cubelet.userData.stickers.forEach(sticker => sticker.material.emissive.setHex(HIGHLIGHT_GLOW));
            }
        }
    }

    clearHighlights() {
        this.forEachSticker(material => material.emissive.setHex(0x000000));
    }

    // Calls back with each sticker's material and its index in CubeState's layout,
    // wherever the cubelets have been turned to. Only valid while no turn is animating.
    forEachSticker(callback) {
        for (const cubelet of this.cubelets) {
            for (const sticker of cubelet.userData.stickers) {
                // The sticker started out pointing along its side's normal; this is where it points now
                const direction = FACES[sticker.userData.side].normal.clone().applyQuaternion(cubelet.quaternion).round();
                callback(sticker.material, faceletIndex(cubelet.position.toArray(), direction.toArray()));
            }
        }
    }
}

// A thin rounded square in the xy plane, facing +z, with softly beveled edges that catch the light
function createStickerGeometry() {
    const half = STICKER_SIZE / 2;
    const inner = half - STICKER_ROUNDING;
    const shape = new THREE.Shape();
    shape.moveTo(-inner, -half);
    shape.lineTo(inner, -half);
    shape.quadraticCurveTo(half, -half, half, -inner);
    shape.lineTo(half, inner);
    shape.quadraticCurveTo(half, half, inner, half);
    shape.lineTo(-inner, half);
    shape.quadraticCurveTo(-half, half, -half, inner);
    shape.lineTo(-half, -inner);
    shape.quadraticCurveTo(-half, -half, -inner, -half);

    const bevel = STICKER_THICKNESS / 3;
    return new THREE.ExtrudeGeometry(shape, {
        depth: STICKER_THICKNESS - 2 * bevel,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
        curveSegments: 6
    });
}

// Glossy plastic: a clear coat on top gives the sharp reflections of a new cube
function createStickerMaterial(color) {
    return new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.35,
        // Not a full coat: at glancing angles it would mirror the bright room and wash out darker colors like blue
        clearcoat: 0.5,
        clearcoatRoughness: 0.1
    });
}

export default RubiksCube;
