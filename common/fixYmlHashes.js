import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sha512Base64(filePath) {
  const buf = await fs.readFile(filePath);
  const h = createHash('sha512');
  h.update(buf);
  return h.digest('base64');
}

async function fileSize(filePath) {
  const st = await fs.stat(filePath);
  return st.size;
}

async function fixOneYaml(ymlPath, distDir) {
  let raw;
  try {
    raw = await fs.readFile(ymlPath, 'utf8');
  } catch (e) {
    console.error(`✗ Cannot read ${ymlPath}:`, e.message);
    return;
  }

  let doc;
  try {
    doc = YAML.parse(raw);
  } catch (e) {
    console.error(`✗ Cannot parse YAML ${ymlPath}:`, e.message);
    return;
  }

  if (!doc || !Array.isArray(doc.files)) {
    console.warn(`! ${path.basename(ymlPath)} has no 'files' array — skipped.`);
    return;
  }

  let changed = false;

  // Update each files[i].sha512 and files[i].size based on files[i].url
  for (const entry of doc.files) {
    if (!entry?.url) continue;

    const target = path.resolve(distDir, entry.url);
    try {
      const [hash, size] = await Promise.all([sha512Base64(target), fileSize(target)]);
      if (entry.sha512 !== hash || entry.size !== size) {
        console.log(`• ${path.basename(ymlPath)}: refresh ${entry.url}`);
        entry.sha512 = hash;
        entry.size = size;
        changed = true;
      }
    } catch (e) {
      console.warn(
        `! Missing or unreadable file for ${entry.url} (referenced by ${path.basename(ymlPath)}): ${e.message}`
      );
    }
  }

  // Update top-level sha512 for the primary "path" file if present
  if (doc.path) {
    const primary = path.resolve(distDir, doc.path);
    try {
      const hash = await sha512Base64(primary);
      if (doc.sha512 !== hash) {
        console.log(`• ${path.basename(ymlPath)}: refresh top-level sha512 for path=${doc.path}`);
        doc.sha512 = hash;
        changed = true;
      }
    } catch (e) {
      console.warn(`! Primary 'path' file not found for ${path.basename(ymlPath)}: ${doc.path} (${e.message})`);
    }
  }

  if (changed) {
    const out = YAML.stringify(doc);
    await fs.writeFile(ymlPath, out, 'utf8');
    console.log(`✓ Updated ${path.basename(ymlPath)}`);
  } else {
    console.log(`= No changes for ${path.basename(ymlPath)}`);
  }
}

async function main() {
  const distDir = path.resolve(process.argv[2] ?? path.join(__dirname, '..', 'app', 'dist'));
  const entries = await fs.readdir(distDir);
  const ymls = entries.filter(f => f.toLowerCase().endsWith('.yml'));

  if (ymls.length === 0) {
    console.warn(`No .yml files found in ${distDir}`);
    return;
  }

  console.log(`Scanning ${distDir}`);
  for (const y of ymls) {
    await fixOneYaml(path.join(distDir, y), distDir);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
