import { defineConfig } from 'vite';

export default defineConfig({
    // GitHub Pages serves this project under /<repo-name>/, so built asset paths must start with it
    base: '/Rubik-s-Cube-Three.js-Simulation/',
    test: {
        // npm run test:coverage measures how much of the app code the tests run
        coverage: {
            include: ['src/**'],
        },
    },
    build: {
        // Three.js alone is about 550 KB, above Vite's default 500 KB warning.
        // This limit still warns if the bundle grows noticeably beyond that.
        chunkSizeWarningLimit: 650,
    },
});
