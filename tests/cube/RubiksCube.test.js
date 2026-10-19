import { describe, it, expect } from 'vitest';
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
});
