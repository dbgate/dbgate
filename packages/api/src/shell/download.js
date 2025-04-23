const crypto = require('crypto');
const path = require('path');
const { uploadsdir, archivedir } = require('../utility/directories');
const { downloadFile } = require('../utility/downloader');
const extractSingleFileFromZip = require('../utility/extractSingleFileFromZip');

async function download(url, options = {}) {
  const { targetFile } = options || {};
  if (url) {
    if (url.match(/(^http:\/\/)|(^https:\/\/)/)) {
      const destFile = targetFile || path.join(uploadsdir(), crypto.randomUUID());
      await downloadFile(url, destFile);
      return destFile;
    }
    const zipMatch = url.match(/^zip\:\/\/(.*)\/\/(.*)$/);
    if (zipMatch) {
      const destFile = targetFile || path.join(uploadsdir(), crypto.randomUUID());
      let zipFile = zipMatch[1];
      if (zipFile.startsWith('archive:')) {
        zipFile = path.join(archivedir(), zipFile.substring('archive:'.length));
      }

      await extractSingleFileFromZip(zipFile, zipMatch[2], destFile);
      return destFile;
    }
  }

  return url;
}

module.exports = download;
