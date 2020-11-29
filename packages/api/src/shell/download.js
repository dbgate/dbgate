const path = require('path');
const uuidv1 = require('uuid/v1');
const { uploadsdir } = require('../utility/directories');
const { downloadFile } = require('../utility/downloader');

async function download(url) {
  if (url && url.match(/(^http:\/\/)|(^https:\/\/)/)) {
    const tmpFile = path.join(uploadsdir(), uuidv1());
    await downloadFile(url, tmpFile);
    return tmpFile;
  }
  return url;
}

module.exports = download;
