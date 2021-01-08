const os = require('os');
const path = require('path');
const fs = require('fs');
const cleanDirectory = require('./cleanDirectory');

const createDirectories = {};
const ensureDirectory = (dir, clean) => {
  if (!createDirectories[dir]) {
    if (clean && fs.existsSync(dir)) {
      console.log(`Cleaning directory ${dir}`);
      cleanDirectory(dir);
    }
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory ${dir}`);
      try {
        fs.mkdirSync(dir);
      } catch (err) {
        console.error(`Error creating ${dir} directory`, err);
      }
    }
    createDirectories[dir] = true;
  }
};

function datadir() {
  const dir = path.join(os.homedir(), 'dbgate-data');
  ensureDirectory(dir);

  return dir;
}

const dirFunc = (dirname, clean = false) => () => {
  const dir = path.join(datadir(), dirname);
  ensureDirectory(dir, clean);

  return dir;
};

const jsldir = dirFunc('jsl', true);
const rundir = dirFunc('run', true);
const uploadsdir = dirFunc('uploads', true);
const pluginsdir = dirFunc('plugins');
const archivedir = dirFunc('archive');
const filesdir = dirFunc('files');

module.exports = {
  datadir,
  jsldir,
  rundir,
  uploadsdir,
  archivedir,
  ensureDirectory,
  pluginsdir,
  filesdir,
};
