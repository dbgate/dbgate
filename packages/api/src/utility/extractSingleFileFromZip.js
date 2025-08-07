const yauzl = require('yauzl');
const fs = require('fs');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const logger = getLogger('extractSingleFileFromZip');
/**
 * Extracts a single file from a ZIP using yauzl.
 * Stops reading the rest of the archive once the file is found.
 *
 * @param {string} zipPath - Path to the ZIP file on disk.
 * @param {string} fileInZip - The file path *inside* the ZIP to extract.
 * @param {string} outputPath - Where to write the extracted file on disk.
 * @returns {Promise<boolean>} - Resolves with a success message or a "not found" message.
 */
function extractSingleFileFromZip(zipPath, fileInZip, outputPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipFile) => {
      if (err) return reject(err);

      let fileFound = false;

      // Start reading the first entry
      zipFile.readEntry();

      zipFile.on('entry', entry => {
        // Compare the entry name to the file we want
        if (entry.fileName === fileInZip) {
          fileFound = true;

          // Open a read stream for this entry
          zipFile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);

            // Create a write stream to outputPath
            const writeStream = fs.createWriteStream(outputPath);
            readStream.pipe(writeStream);

            // When the read stream ends, we can close the zipFile
            readStream.on('end', () => {
              // We won't read further entries
              zipFile.close();
            });

            // When the file is finished writing, resolve
            writeStream.on('finish', () => {
              logger.info(`DBGM-00088 File "${fileInZip}" extracted to "${outputPath}".`);
              resolve(true);
            });

            // Handle write errors
            writeStream.on('error', writeErr => {
              logger.error(extractErrorLogData(writeErr), `DBGM-00089 Error extracting "${fileInZip}" from "${zipPath}".`);
              reject(writeErr);
            });
          });
        } else {
          // Not the file we want; skip to the next entry
          zipFile.readEntry();
        }
      });

      // If we reach the end without finding the file
      zipFile.on('end', () => {
        if (!fileFound) {
          resolve(false);
        }
      });

      // Handle general errors
      zipFile.on('error', err => {
        logger.error(extractErrorLogData(err), `DBGM-00172 ZIP file error in ${zipPath}.`);
        reject(err);
      });
    });
  });
}

module.exports = extractSingleFileFromZip;
