const fs = require('fs-extra');
const path = require('path');
const { filesdir } = require('../utility/directories');

async function loadFile(file) {
  const text = await fs.readFile(path.join(filesdir(), file), { encoding: 'utf-8' });
  return text;
}

module.exports = loadFile;
