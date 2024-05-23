const crypto = require('crypto');
const path = require('path');
const { uploadsdir } = require('../utility/directories');
const { downloadFile } = require('../utility/downloader');

async function download(url) {
  if (url && url.match(/(^http:\/\/)|(^https:\/\/)/)) {
    const tmpFile = path.join(uploadsdir(), crypto.randomUUID());
    await downloadFile(url, tmpFile);
    return tmpFile;
  }
  return url;
}

module.exports = download;
