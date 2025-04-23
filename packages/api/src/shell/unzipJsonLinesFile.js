const yauzl = require('yauzl');
const fs = require('fs');
const { jsonLinesParse } = require('dbgate-tools');

function unzipJsonLinesFile(zipPath, fileInZip) {
  return new Promise((resolve, reject) => {
    // Open the zip file
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        return reject(err);
      }

      let result = null;

      // Start reading entries
      zipfile.readEntry();

      zipfile.on('entry', entry => {
        if (entry.fileName == fileInZip) {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              return reject(err);
            }

            const chunks = [];
            readStream.on('data', chunk => chunks.push(chunk));
            readStream.on('end', () => {
              try {
                const fileContent = Buffer.concat(chunks).toString('utf-8');
                const parsedJson = jsonLinesParse(fileContent);
                result = parsedJson;
              } catch (parseError) {
                return reject(parseError);
              }

              // Move to the next entry
              zipfile.readEntry();
            });
          });
        } else {
          // Not a JSON file, skip
          zipfile.readEntry();
        }
      });

      // Resolve when no more entries
      zipfile.on('end', () => {
        resolve(result);
      });

      // Catch errors from zipfile
      zipfile.on('error', zipErr => {
        reject(zipErr);
      });
    });
  });
}

module.exports = unzipJsonLinesFile;
