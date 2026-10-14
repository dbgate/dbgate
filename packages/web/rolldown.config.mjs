import { defineConfig } from 'rolldown';
import { replacePlugin } from 'rolldown/plugins';
import svelte from 'rollup-plugin-svelte';
import livereload from 'rollup-plugin-livereload';
import copy from 'rollup-plugin-copy';
import sveltePreprocess from 'svelte-preprocess';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const production = process.env.NODE_ENV === 'production';

// Rolldown 1.0 stable removed its experimental CSS bundling. This plugin keeps the previous behaviour:
// CSS modules (Svelte component styles and imported .css files, with @import statements inlined)
// are concatenated in module order and emitted as a single CSS asset.
function cssBundle({ fileName }) {
  const cssModules = new Map();

  function inlineImports(code, fromFile, seen) {
    return code.replace(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]\s*\)?[^;]*;/g, (statement, specifier) => {
      let resolved;
      try {
        resolved = createRequire(fromFile).resolve(specifier.startsWith('.') ? path.resolve(path.dirname(fromFile), specifier) : specifier);
      } catch {
        return statement;
      }
      if (seen.has(resolved)) return '';
      seen.add(resolved);
      return inlineImports(fs.readFileSync(resolved, 'utf8'), resolved, seen);
    });
  }

  return {
    name: 'css-bundle',
    transform: {
      filter: { id: /\.css$/ },
      handler(code, id) {
        const file = id.split('?')[0];
        cssModules.set(id, fs.existsSync(file) ? inlineImports(code, file, new Set([file])) : code);
        return { code: 'export {};', map: null, moduleType: 'js', moduleSideEffects: true };
      },
    },
    generateBundle(options, bundle) {
      // module execution order - depth-first walk of static imports from entry modules
      const ordered = [];
      const visited = new Set();
      const visit = id => {
        if (visited.has(id)) return;
        visited.add(id);
        const info = this.getModuleInfo(id);
        if (!info) return;
        for (const imported of info.importedIds) visit(imported);
        if (cssModules.has(id)) ordered.push(cssModules.get(id));
      };
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && chunk.facadeModuleId) visit(chunk.facadeModuleId);
      }
      this.emitFile({ type: 'asset', fileName, source: ordered.join('\n') });
    },
  };
}

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true,
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    },
  };
}

export default defineConfig([
  // Web Worker entry
  {
    input: 'src/query/QueryParserWorker.js',
    output: {
      sourcemap: !production,
      format: 'iife',
      file: 'public/build/query-parser-worker.js',
      minify: production,
    },
    platform: 'browser',
  },

  // Main application entry
  {
    input: 'src/main.ts',
    output: {
      sourcemap: !production,
      format: 'iife',
      name: 'app',
      dir: 'public/build',
      entryFileNames: 'bundle.js',
      minify: production,
    },
    // dbgate-types is a TypeScript-only package (no runtime code).
    // Mark it external so rolldown doesn't try to bundle it.
    external: ['dbgate-types'],
    platform: 'browser',
    resolve: {
      conditionNames: ['svelte', 'browser', 'import'],
    },
    // Shim Node's `global` for browser (used by debug, dbgate-tools getLogger, etc.)
    transform: {
      define: {
        global: 'globalThis',
      },
    },
    // Handle non-JS asset types referenced from CSS (e.g. leaflet marker images)
    moduleTypes: {
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.gif': 'dataurl',
      '.svg': 'dataurl',
    },
    plugins: [
      // ace-builds addon files (keybinding-vim, modes, themes, etc.) reference
      // the bare `ace` global set by ace.js on window. We must ensure ace.js is
      // evaluated first, then inject a local `ace` binding for the addon code.
      {
        name: 'ace-global-shim',
        transform(code, id) {
          if (/ace-builds[\\/]src-noconflict[\\/]/.test(id) && !id.endsWith('ace.js')) {
            // Import ace.js first (triggers its IIFE which sets window.ace),
            // then bind the local `ace` variable from window.
            const shimmed = 'import "ace-builds/src-noconflict/ace";\nvar ace = window.ace;\n' + code;
            return { code: shimmed, map: null };
          }
        },
      },

      // Resolve chart.js/dist to chart.js (not exported in package.json exports field)
      {
        name: 'resolve-chartjs-dist',
        resolveId: {
          filter: { id: /chart\.js\/dist/ },
          handler(source) {
            if (source === 'chart.js/dist') {
              return this.resolve('chart.js', undefined, { skipSelf: true });
            }
          },
        },
      },

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

      replacePlugin({
        'process.env.API_URL': JSON.stringify(process.env.API_URL),
      }),

      svelte({
        preprocess: sveltePreprocess({
          sourceMap: !production,
          typescript: {
            compilerOptions: {
              verbatimModuleSyntax: true,
            },
          },
        }),
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
          handler(warning);
        },
        // CSS is collected by the css-bundle plugin below
        emitCss: true,
      }),

      cssBundle({ fileName: 'bundle.css' }),

      // In dev mode, call `npm run start` once
      // the bundle has been generated
      !production && serve(),

      // Watch the `public` directory and refresh the
      // browser on changes when not in production
      !production && livereload('public'),
    ],
    watch: {
      clearScreen: true,
    },
  },
]);
