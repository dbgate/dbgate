const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const { archivedir } = require('../utility/directories');
const logger = getLogger('compressDirectory');

function zipDirectory(inputDirectory, outputFile) {
  if (outputFile.startsWith('archive:')) {
    outputFile = path.join(archivedir(), outputFile.substring('archive:'.length));
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFile);
    const archive = archiver('zip', { zlib: { level: 9 } }); // level: 9 => best compression

    // Listen for all archive data to be written
    output.on('close', () => {
      logger.info(`DBGM-00072 ZIP file created (${archive.pointer()} total bytes)`);
      resolve();
    });

    archive.on('warning', err => {
      logger.warn(extractErrorLogData(err), `DBGM-00073 Warning while creating ZIP: ${err.message}`);
    });

    archive.on('error', err => {
      logger.error(extractErrorLogData(err), `DBGM-00074 Error while creating ZIP: ${err.message}`);
      reject(err);
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Append files from a folder
    archive.directory(inputDirectory, false, entryData => {
      if (entryData.name.endsWith('.zip')) {
        return false; // returning false means "do not include"
      }
      // otherwise, include it
      return entryData;
    });

    // Finalize the archive
    archive.finalize();
  });
}

module.exports = zipDirectory;
