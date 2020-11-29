const path = require('path');
const uuidv1 = require('uuid/v1');
const { uploadsdir } = require('../utility/directories');
const { downloadFile } = require('../utility/downloader');

async function download(url) {
  const tmpFile = path.join(uploadsdir(), uuidv1() + '.tgz');
  await downloadFile(url, tmpFile);
  return tmpFile;
}

module.exports = download;
