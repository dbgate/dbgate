import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import copy from 'rollup-plugin-copy';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import css from 'rollup-plugin-css-only';
import json from '@rollup/plugin-json';

const production = !process.env.ROLLUP_WATCH;

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true,
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    },
  };
}

export default [
  {
    input: 'src/query/QueryParserWorker.js',
    output: {
      sourcemap: true,
      format: 'iife',
      file: 'public/build/query-parser-worker.js',
    },
    plugins: [
      commonjs(),
      resolve({
        browser: true,
      }),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
  },

  {
    input: 'src/main.ts',
    output: {
      sourcemap: true,
      format: 'iife',
      name: 'app',
      file: 'public/build/bundle.js',
    },
    plugins: [
      copy({
        targets: [
          {
            src: '../../node_modules/@mdi/font/css/materialdesignicons.css',
            dest: 'public/build/fonts/',
          },
          {
            src: '../../node_modules/@mdi/font/fonts/*',
            dest: 'public/build/fonts/',
          },
          {
            src: '../../node_modules/diff2html/bundles/css/diff2html.min.css',
            dest: 'public/build/',
          },
        ],
      }),

      replace({
        'process.env.API_URL': JSON.stringify(process.env.API_URL),
      }),

      svelte({
        preprocess: sveltePreprocess({ sourceMap: !production }),
        compilerOptions: {
          // enable run-time checks when not in production
          dev: !production,
        },
        onwarn: (warning, handler) => {
          const ignoreWarnings = [
            'a11y-click-events-have-key-events',
            'a11y-missing-attribute',
            'a11y-invalid-attribute',
            'a11y-no-noninteractive-tabindex',
            'a11y-label-has-associated-control',
            'vite-plugin-svelte-css-no-scopable-elements',
            'unused-export-let',
          ];
          if (ignoreWarnings.includes(warning.code)) return;
          // console.log('***************************', warning.code);
          handler(warning);
        },
      }),
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css({ output: 'bundle.css' }),

      // If you have external dependencies installed from
      // npm, you'll most likely need these plugins. In
      // some cases you'll need additional configuration -
      // consult the documentation for details:
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      resolve({
        browser: true,
        dedupe: ['svelte'],
      }),
      commonjs(),
      typescript({
        sourceMap: !production,
        inlineSources: !production,
      }),
      json(),

      // In dev mode, call `npm run start` once
      // the bundle has been generated
      !production && serve(),

      // Watch the `public` directory and refresh the
      // browser on changes when not in production
      !production && livereload('public'),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
    watch: {
      clearScreen: true,
    },
  },
];
