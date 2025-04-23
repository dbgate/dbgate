const yauzl = require('yauzl');
const path = require('path');

/**
 * Lists the files in a ZIP archive using yauzl,
 * returning an array of { fileName, uncompressedSize } objects.
 *
 * @param {string} zipPath - The path to the ZIP file.
 * @returns {Promise<Array<{fileName: string, uncompressedSize: number}>>}
 */
function listZipEntries(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      const entries = [];

      // Start reading entries
      zipfile.readEntry();

      // Handle each entry
      zipfile.on('entry', entry => {
        entries.push({
          fileName: entry.fileName,
          uncompressedSize: entry.uncompressedSize,
        });

        // Move on to the next entry (we’re only listing, not reading file data)
        zipfile.readEntry();
      });

      // Finished reading all entries
      zipfile.on('end', () => resolve(entries));

      // Handle errors
      zipfile.on('error', err => reject(err));
    });
  });
}

module.exports = listZipEntries;
