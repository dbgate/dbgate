const os = require('os');
const path = require('path');
const fs = require('fs');

let createdDatadir = false;
const createDirectories = {};

function datadir() {
  const dir = path.join(os.homedir(), 'dbgate-data');
  if (!createdDatadir) {
    if (!fs.existsSync(dir)) {
      console.log(`Creating data directory ${dir}`);
      fs.mkdirSync(dir);
    }
    createdDatadir = true;
  }

  return dir;
}

const dirFunc = (dirname) => () => {
  const dir = path.join(datadir(), dirname);
  if (!createDirectories[dirname]) {
    if (!fs.existsSync(dir)) {
      console.log(`Creating jsl directory ${dir}`);
      fs.mkdirSync(dir);
    }
    createDirectories[dirname] = true;
  }

  return dir;
};

const jsldir = dirFunc('jsl');
const rundir = dirFunc('run');
const uploadsdir = dirFunc('uploads');

module.exports = {
  datadir,
  jsldir,
  rundir,
  uploadsdir,
};
