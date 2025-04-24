const yauzl = require('yauzl');
const fs = require('fs');
const { jsonLinesParse } = require('dbgate-tools');

function unzipJsonLinesData(zipPath) {
  return new Promise((resolve, reject) => {
    // Open the zip file
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        return reject(err);
      }

      const results = {};

      // Start reading entries
      zipfile.readEntry();

      zipfile.on('entry', entry => {
        // Only process .json files
        if (/\.jsonl$/i.test(entry.fileName)) {
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
                results[entry.fileName.replace(/\.jsonl$/, '')] = parsedJson;
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
        resolve(results);
      });

      // Catch errors from zipfile
      zipfile.on('error', zipErr => {
        reject(zipErr);
      });
    });
  });
}

module.exports = unzipJsonLinesData;
