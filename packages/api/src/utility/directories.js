const os = require('os');
const path = require('path');
const fs = require('fs');

const createDirectories = {};

const ensureDirectory = (dir) => {
  if (!createDirectories[dir]) {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory ${dir}`);
      fs.mkdirSync(dir);
    }
    createDirectories[dir] = true;
  }
};

function datadir() {
  const dir = path.join(os.homedir(), 'dbgate-data');
  ensureDirectory(dir);

  return dir;
}

const dirFunc = (dirname) => () => {
  const dir = path.join(datadir(), dirname);
  ensureDirectory(dir);

  return dir;
};

const jsldir = dirFunc('jsl');
const rundir = dirFunc('run');
const uploadsdir = dirFunc('uploads');
const archivedir = dirFunc('archive');

module.exports = {
  datadir,
  jsldir,
  rundir,
  uploadsdir,
  archivedir,
  ensureDirectory,
};
