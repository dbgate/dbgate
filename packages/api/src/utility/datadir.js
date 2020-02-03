const os = require('os');
const path = require('path');
const fs = require('fs-extra');

let created = false;

module.exports = async function datadir() {
  const dir = path.join(os.homedir(), 'dbgate-data');
  if (!created) {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory) {
      await fs.mkdir(dir);
    }
    created = true;
  }

  return dir;
};
