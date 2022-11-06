import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import rollupCommonjs from '@rollup/plugin-commonjs';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5001,
  },
  plugins: [
    svelte(),
    viteCommonjs({
      include: ['mainMenuDefinition'],
    }),
    viteStaticCopy({
      targets: [
        {
          src: '../../node_modules/@mdi/font/css/materialdesignicons.css',
          dest: 'assets/',
        },
        {
          src: '../../node_modules/@mdi/font/fonts/*',
          dest: 'fonts/',
        },
        {
          src: '../../node_modules/diff2html/bundles/css/diff2html.min.css',
          dest: 'assets/',
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      plugins: [rollupCommonjs()],
    },
  },
});
