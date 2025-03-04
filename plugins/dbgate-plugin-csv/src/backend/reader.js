const _ = require('lodash');
const csv = require('csv');
const fs = require('fs');
const stream = require('stream');
const lineReader = require('line-reader');

let dbgateApi;

function readFirstLine(file) {
  return new Promise((resolve, reject) => {
    lineReader.open(file, (err, reader) => {
      if (err) {
        reject(err);
        return;
      }
      if (reader.hasNextLine()) {
        reader.nextLine((err, line) => {
          if (err) {
            reader.close(() => reject(err)); // Ensure reader is closed on error
            return;
          }
          reader.close(() => resolve(line)); // Ensure reader is closed after reading
        });
      } else {
        reader.close(() => resolve(null)); // Properly close if no lines are present
      }
    });
  });
}

class CsvPrepareStream extends stream.Transform {
  constructor({ header }) {
    super({ objectMode: true });
    this.structure = null;
    this.header = header;
  }
  _transform(chunk, encoding, done) {
    if (this.structure) {
      this.push(
        _.zipObject(
          this.structure.columns.map((x) => x.columnName),
          chunk
        )
      );
      done();
    } else {
      if (this.header) {
        this.structure = {
          __isStreamHeader: true,
          columns: chunk.map((columnName) => ({ columnName })),
        };
        this.push(this.structure);
      } else {
        this.structure = {
          __isStreamHeader: true,
          columns: chunk.map((value, index) => ({ columnName: `col${index + 1}` })),
        };
        this.push(this.structure);
        this.push(
          _.zipObject(
            this.structure.columns.map((x) => x.columnName),
            chunk
          )
        );
      }
      done();
    }
  }
}

async function reader({ fileName, encoding = 'utf-8', header = true, delimiter, limitRows = undefined }) {
  console.log(`Reading file ${fileName}`);
  const downloadedFile = await dbgateApi.download(fileName);

  if (!delimiter) {
    // auto detect delimiter
    // read first line from downloadedFile
    const firstLine = await readFirstLine(downloadedFile);
    if (firstLine) {
      const delimiterCounts = {
        ',': firstLine.replace(/[^,]/g, '').length,
        ';': firstLine.replace(/[^;]/g, '').length,
        '|': firstLine.replace(/[^|]/g, '').length,
      };

      delimiter = Object.keys(delimiterCounts).reduce((a, b) => (delimiterCounts[a] > delimiterCounts[b] ? a : b), ',');
    }
  }
  const csvStream = csv.parse({
    // @ts-ignore
    delimiter,
    skip_lines_with_error: true,
    to_line: limitRows ? limitRows + 1 : undefined,
    ltrim: true,
  });
  const fileStream = fs.createReadStream(downloadedFile, encoding);
  const csvPrepare = new CsvPrepareStream({ header });
  return [fileStream, csvStream, csvPrepare];
  // fileStream.pipe(csvStream);
  // csvStream.pipe(csvPrepare);
  // return csvPrepare;
}

reader.initialize = (dbgateEnv) => {
  dbgateApi = dbgateEnv.dbgateApi;
};

module.exports = reader;
