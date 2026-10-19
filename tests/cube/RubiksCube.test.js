import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SOLVED } from '../../src/cube/CubeState.js';
import { readFacelets } from '../helpers/readFacelets.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import RubiksCube, { HIGHLIGHT_GLOW } from '../../src/cube/RubiksCube.js';
import { FACES } from '../../src/cube/faces.js';

describe('RubiksCube', () => {
    const cube = new RubiksCube();

    it('has 26 cubelets, one in every grid position except the hidden center', () => {
        expect(cube.cubelets).toHaveLength(26);

        const positions = new Set(cube.cubelets.map(cubelet => cubelet.position.toArray().join(',')));
        expect(positions.size).toBe(26);
        expect(positions.has('0,0,0')).toBe(false);
    });

    it('has 54 stickers, 9 of each color', () => {
        const stickers = cube.cubelets.flatMap(cubelet => cubelet.userData.stickers);
        expect(stickers).toHaveLength(54);
        for (const face of FACES) {
            const colored = stickers.filter(sticker => `#${sticker.material.color.getHexString()}` === face.hex);
            expect(colored, face.color).toHaveLength(9);
        }
    });

    it('puts a sticker in its face color on every side that faces out of the cube, and nowhere else', () => {
        for (const cubelet of cube.cubelets) {
            const outerSides = FACES.flatMap((face, side) => (cubelet.position.dot(face.normal) === 1 ? [side] : []));
            expect(cubelet.userData.stickers.map(sticker => sticker.userData.side)).toEqual(outerSides);

            for (const sticker of cubelet.userData.stickers) {
                const face = FACES[sticker.userData.side];
                expect(`#${sticker.material.color.getHexString()}`).toBe(face.hex);
                // It lies on the outside of the body, facing out
                expect(sticker.position.dot(face.normal)).toBeCloseTo(0.475);
                const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(sticker.quaternion);
                expect(facing.dot(face.normal)).toBeCloseTo(1);
            }
        }
    });

    it('builds every cubelet as a rounded black body that casts a shadow', () => {
        for (const cubelet of cube.cubelets) {
            expect(cubelet.geometry).toBeInstanceOf(RoundedBoxGeometry);
            expect(cubelet.material.color.getHexString()).toBe('111111');
            expect(cubelet.castShadow).toBe(true);
        }
    });

    it('highlights the stickers on the chosen face, and removes the highlight again', () => {
        const glowing = () => cube.cubelets.filter(cubelet => cubelet.userData.stickers[0].material.emissive.getHex() !== 0);

        cube.highlightFace('U');
        expect(glowing()).toHaveLength(9);
        expect(glowing().every(cubelet => cubelet.position.y === 1)).toBe(true);
        // Every sticker on those cubelets glows, not only the one on the U face
        const corner = cube.cubelets.find(cubelet => cubelet.position.equals(new THREE.Vector3(1, 1, 1)));
        corner.userData.stickers.forEach(sticker => expect(sticker.material.emissive.getHex()).toBe(HIGHLIGHT_GLOW));

        cube.highlightFace(null);
        expect(glowing()).toHaveLength(0);
    });

    it('gives every sticker its own material, so one can glow without the others', () => {
        const materials = new Set(cube.cubelets.flatMap(cubelet => cubelet.userData.stickers.map(sticker => sticker.material)));
        expect(materials.size).toBe(54);
    });

    it('shows any stickers with setStickers, grey where unpainted, with every cubelet back home', () => {
        const model = new RubiksCube();
        model.cubelets[0].position.set(1, 1, 1);
        model.cubelets[0].rotateX(Math.PI / 2);

        const facelets = [...SOLVED];
        facelets[0] = 'F';
        facelets[20] = 'U';
        facelets[1] = null;
        model.setStickers(facelets);

        expect(readFacelets(model)).toBe(facelets.map(sticker => sticker ?? '?').join(''));
        for (const cubelet of model.cubelets) {
            expect(cubelet.position.equals(cubelet.userData.home)).toBe(true);
            expect(cubelet.quaternion.equals(new THREE.Quaternion())).toBe(true);
        }
    });

    it('highlights single stickers by index, and clears all highlights', () => {
        const model = new RubiksCube();
        model.highlightStickers([0, 8, 22]);
        const glowing = [];
        model.forEachSticker((material, index) => {
            if (material.emissive.getHex() !== 0) {
                glowing.push(index);
            }
        });
        expect(glowing.sort((a, b) => a - b)).toEqual([0, 8, 22]);

        model.clearHighlights();
        model.forEachSticker(material => expect(material.emissive.getHex()).toBe(0));
    });
});
