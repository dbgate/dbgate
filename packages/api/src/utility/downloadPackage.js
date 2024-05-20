const crypto = require('crypto');
// const pacote = require('pacote');
const axios = require('axios');
// const tarballExtract = require('tarball-extract');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const tar = require('tar');
const ncp = require('ncp').ncp;
const { uploadsdir } = require('./directories');
const { downloadFile } = require('./downloader');

function extractTarball(tmpFile, destination) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(tmpFile)
      .pipe(zlib.createGunzip())
      .pipe(tar.extract({ cwd: destination }))
      .on('error', err => reject(err))
      .on('end', () => resolve());
  });
}

function copyDirectory(source, target) {
  return new Promise((resolve, reject) => {
    ncp(source, target, err => {
      if (err) reject(err);
      resolve();
    });
  });
}

async function downloadPackage(packageName, directory) {
  // await pacote.extract(packageName, directory);
  const infoResp = await axios.default.get(`https://registry.npmjs.org/${packageName}`);

  const { latest } = infoResp.data['dist-tags'] || {};
  if (!latest) return false;

  const tarball = infoResp.data.versions[latest].dist.tarball;

  const tmpFile = path.join(uploadsdir(), crypto.randomUUID() + '.tgz');
  await downloadFile(tarball, tmpFile);
  const tmpDir = path.join(uploadsdir(), crypto.randomUUID());
  fs.mkdirSync(tmpDir);
  await extractTarball(tmpFile, tmpDir);
  await copyDirectory(path.join(tmpDir, 'package'), directory);

  return true;
}

module.exports = downloadPackage;
