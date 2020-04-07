const os = require('os');
const path = require('path');
const fs = require('fs');

let createdDatadir = false;
let createdJsldir = false;

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

function jsldir() {
  const dir = path.join(datadir(), 'jsl');
  if (!createdJsldir) {
    if (!fs.existsSync(dir)) {
      console.log(`Creating jsl directory ${dir}`);
      fs.mkdirSync(dir);
    }
    createdJsldir = true;
  }

  return dir;
}

module.exports = {
  datadir,
  jsldir,
};
