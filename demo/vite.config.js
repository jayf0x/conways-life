import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Import the library straight from source so the demo tracks local changes.
const conwaysLife = fileURLToPath(new URL('../src/index.ts', import.meta.url));

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/conways-life/' : '/',
  build: {
    target: 'es2020',
    minify: 'oxc',
    cssMinify: true,
  },
  resolve: {
    alias: [{ find: 'conways-life', replacement: conwaysLife }],
  },
});
