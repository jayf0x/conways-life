import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { snapBuild } from 'byte-snap';
import include from 'plugin-include';

export default defineConfig({
  plugins: [dts({ rollupTypes: true }), snapBuild.vite({ dir: 'dist' }), include('./README.md')],
  build: {
    lib: {
      entry: { index: resolve(__dirname, 'src/index.ts') },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    target: 'es2020',
    minify: 'oxc',
    sourcemap: false,
    rollupOptions: {
      output: { exports: 'named' },
    },
  },
});
