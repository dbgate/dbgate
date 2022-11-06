import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import rollupCommonjs from '@rollup/plugin-commonjs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    viteCommonjs({
      include: ['mainMenuDefinition'],
    }),
  ],
  build: {
    rollupOptions: {
      plugins: [
        rollupCommonjs(),
      ],
    },
  },
});
