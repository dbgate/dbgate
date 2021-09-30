const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { databaseInfoFromYamlModel, DatabaseAnalyser } = require('dbgate-tools');
const { startsWith } = require('lodash');
const { archivedir } = require('./directories');

async function importDbModel(inputDir) {
  const files = [];

  const dir = inputDir.startsWith('archive:')
    ? path.join(archivedir(), inputDir.substring('archive:'.length))
    : inputDir;

  for (const name of await fs.readdir(dir)) {
    if (name.endsWith('.table.yaml') || name.endsWith('.sql')) {
      const text = await fs.readFile(path.join(dir, name), { encoding: 'utf-8' });

      files.push({
        name,
        text,
        json: name.endsWith('.yaml') ? yaml.load(text) : null,
      });
    }
  }

  return databaseInfoFromYamlModel(files);
}

module.exports = importDbModel;
