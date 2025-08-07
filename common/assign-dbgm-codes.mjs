#!/usr/bin/env node
// assign-dbgm-codes.mjs
import fs from 'fs/promises';
import path from 'path';

const PLACEHOLDER = 'DBGM-00000';
const CODE_RE = /DBGM-(\d{5})/g;
const JS_TS_RE = /\.(mjs|cjs|js|ts|jsx|tsx)$/i;

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
  '.cache',
]);
const IGNORE_FILES = ['assign-dbgm-codes.mjs', 'package.json', 'README.md'];

// --- CLI ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const rootArg = args.find(a => a !== '--dry') || process.cwd();
const root = path.resolve(rootArg);

// --- helpers ---
async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      yield* walk(path.join(dir, e.name));
    } else if (e.isFile()) {
      if (JS_TS_RE.test(e.name) && !IGNORE_FILES.includes(e.name)) yield path.join(dir, e.name);
    }
  }
}

function formatCode(n) {
  return `DBGM-${String(n).padStart(5, '0')}`;
}

// Find the smallest positive integer not in `taken`
function makeNextCodeFn(taken) {
  let n = 1;
  // advance n to first free
  while (taken.has(n)) n++;
  return () => {
    const code = n;
    taken.add(code);
    // move n to next free for next call
    do {
      n++;
    } while (taken.has(n));
    return formatCode(code);
  };
}

// --- main ---
(async () => {
  console.log(`Scanning: ${root} ${dryRun ? '(dry run)' : ''}`);

  // 1) Collect all taken codes across the repo
  const taken = new Set(); // numeric parts only
  const files = [];
  for await (const file of walk(root)) files.push(file);

  await Promise.all(
    files.map(async file => {
      try {
        const text = await fs.readFile(file, 'utf8');
        for (const m of text.matchAll(CODE_RE)) {
          const num = Number(m[1]);
          if (Number.isInteger(num) && num > 0) taken.add(num);
        }
      } catch (err) {
        console.warn(`! Failed to read ${file}: ${err.message}`);
      }
    })
  );

  console.log(`Found ${taken.size} occupied code(s).`);

  // 2) Replace placeholders with next available unique code
  const nextCode = makeNextCodeFn(taken);

  let filesChanged = 0;
  let placeholdersReplaced = 0;

  for (const file of files) {
    let text;
    try {
      text = await fs.readFile(file, 'utf8');
    } catch (err) {
      console.warn(`! Failed to read ${file}: ${err.message}`);
      continue;
    }

    if (!text.includes(PLACEHOLDER)) continue;

    let countInFile = 0;
    const updated = text.replaceAll(PLACEHOLDER, () => {
      countInFile++;
      return nextCode();
    });

    if (countInFile > 0) {
      placeholdersReplaced += countInFile;
      filesChanged++;
      console.log(`${dryRun ? '[dry]' : '[write]'} ${file} — ${countInFile} replacement(s)`);
      if (!dryRun) {
        try {
          await fs.writeFile(file, updated, 'utf8');
        } catch (err) {
          console.warn(`! Failed to write ${file}: ${err.message}`);
        }
      }
    }
  }

  console.log(`Done. Files changed: ${filesChanged}, placeholders replaced: ${placeholdersReplaced}.`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
