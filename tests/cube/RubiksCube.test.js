import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SOLVED } from '../../src/cube/CubeState.js';
import { readFacelets } from '../helpers/readFacelets.js';
import RubiksCube from '../../src/cube/RubiksCube.js';
import { FACES } from '../../src/cube/faces.js';

const BLACK = '000000';

describe('RubiksCube', () => {
    const cube = new RubiksCube();

    it('has 26 cubelets, one in every grid position except the hidden center', () => {
        expect(cube.cubelets).toHaveLength(26);

        const positions = new Set(cube.cubelets.map(cubelet => cubelet.position.toArray().join(',')));
        expect(positions.size).toBe(26);
        expect(positions.has('0,0,0')).toBe(false);
    });

    it('has 9 stickers of each color', () => {
        for (const [index, face] of FACES.entries()) {
            const stickers = cube.cubelets.filter(cubelet => cubelet.material[index].color.getHexString() !== BLACK);
            expect(stickers, face.color).toHaveLength(9);
        }
    });

    it('colors only the sides that face out of the cube, each with its own face color', () => {
        for (const cubelet of cube.cubelets) {
            FACES.forEach((face, index) => {
                const isOutside = cubelet.position.dot(face.normal) === 1;
                const expectedColor = isOutside ? face.hex.slice(1) : BLACK;
                expect(cubelet.material[index].color.getHexString()).toBe(expectedColor);
            });
        }
    });

    it('highlights only the cubelets on the chosen face, and removes the highlight again', () => {
        const glowing = () => cube.cubelets.filter(cubelet => cubelet.material[0].emissive.getHex() !== 0);

        cube.highlightFace('U');
        expect(glowing()).toHaveLength(9);
        expect(glowing().every(cubelet => cubelet.position.y === 1)).toBe(true);

        cube.highlightFace(null);
        expect(glowing()).toHaveLength(0);
    });

    it('gives every cubelet its own materials, so one can glow without the others', () => {
        const materials = new Set(cube.cubelets.flatMap(cubelet => cubelet.material));
        expect(materials.size).toBe(26 * 6);
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
