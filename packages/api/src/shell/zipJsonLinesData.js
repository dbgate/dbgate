const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const archiver = require('archiver');
const { getLogger, extractErrorLogData, jsonLinesStringify } = require('dbgate-tools');
const { archivedir } = require('../utility/directories');
const logger = getLogger('compressDirectory');

function zipDirectory(jsonDb, outputFile) {
  if (outputFile.startsWith('archive:')) {
    outputFile = path.join(archivedir(), outputFile.substring('archive:'.length));
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFile);
    const archive = archiver('zip', { zlib: { level: 9 } }); // level: 9 => best compression

    // Listen for all archive data to be written
    output.on('close', () => {
      logger.info(`DBGM-00075 ZIP file created (${archive.pointer()} total bytes)`);
      resolve();
    });

    archive.on('warning', err => {
      logger.warn(extractErrorLogData(err), `DBGM-00076 Warning while creating ZIP: ${err.message}`);
    });

    archive.on('error', err => {
      logger.error(extractErrorLogData(err), `DBGM-00077 Error while creating ZIP: ${err.message}`);
      reject(err);
    });

    // Pipe archive data to the file
    archive.pipe(output);

    for (const key in jsonDb) {
      const data = jsonDb[key];
      if (_.isArray(data)) {
        const jsonString = jsonLinesStringify(data);
        archive.append(jsonString, { name: `${key}.jsonl` });
      }
    }

    // Finalize the archive
    archive.finalize();
  });
}

module.exports = zipDirectory;
