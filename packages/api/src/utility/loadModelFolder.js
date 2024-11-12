const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { resolveArchiveFolder } = require('./directories');
const loadFilesRecursive = require('./loadFilesRecursive');

async function loadModelFolder(inputDir) {
  const files = [];

  const dir = inputDir.startsWith('archive:')
    ? resolveArchiveFolder(inputDir.substring('archive:'.length))
    : path.resolve(inputDir);

  for (const name of await loadFilesRecursive(dir)) {
    if (name.endsWith('.table.yaml') || name.endsWith('.sql')) {
      const text = await fs.readFile(path.join(dir, name), { encoding: 'utf-8' });

      files.push({
        name: path.parse(name).base,
        text,
        json: name.endsWith('.yaml') ? yaml.load(text) : null,
      });
    }
  }

  return files;
}

module.exports = loadModelFolder;
