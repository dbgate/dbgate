const crypto = require('crypto');
const path = require('path');
const { uploadsdir, archivedir } = require('../utility/directories');
const { downloadFile } = require('../utility/downloader');
const extractSingleFileFromZip = require('../utility/extractSingleFileFromZip');

// In safeRemoteFetch mode the archive folder reference (the part after
// "archive:") must stay inside the managed archive directory.
function isSafeArchiveReference(archiveRelative) {
  if (path.isAbsolute(archiveRelative)) {
    return false;
  }
  return archiveRelative.split(/[\\/]/).every(segment => segment !== '..');
}

async function download(url, options = {}) {
  const { targetFile, safeRemoteFetch } = options || {};
  if (url) {
    if (url.match(/(^http:\/\/)|(^https:\/\/)/)) {
      const destFile = targetFile || path.join(uploadsdir(), crypto.randomUUID());
      await downloadFile(url, destFile, { safeRemoteFetch: !!safeRemoteFetch });
      return destFile;
    }
    const zipMatch = url.match(/^zip\:\/\/(.*)\/\/(.*)$/);
    if (zipMatch) {
      const isArchiveReference = zipMatch[1].startsWith('archive:');
      // In safeRemoteFetch mode only managed archive references are accepted.
      // Extracting from an arbitrary local zip path would be a local file read.
      if (safeRemoteFetch && !isArchiveReference) {
        throw new Error('DBGM-00339 Only http://, https:// and archive references are allowed');
      }
      const destFile = targetFile || path.join(uploadsdir(), crypto.randomUUID());
      let zipFile = zipMatch[1];
      if (isArchiveReference) {
        const archiveRelative = zipFile.substring('archive:'.length);
        if (safeRemoteFetch && !isSafeArchiveReference(archiveRelative)) {
          throw new Error('DBGM-00339 Invalid archive reference');
        }
        zipFile = path.join(archivedir(), archiveRelative);
      }

      await extractSingleFileFromZip(zipFile, zipMatch[2], destFile);
      return destFile;
    }
  }

  // In safeRemoteFetch mode a bare path must not be turned into a local file read.
  if (safeRemoteFetch) {
    throw new Error('DBGM-00339 Only http://, https:// and archive references are allowed');
  }

  return url;
}

module.exports = download;
