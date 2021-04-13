const zipObject = require('lodash/zipObject');
const csv = require('csv');
const fs = require('fs');
const stream = require('stream');

let dbgateApi;
class CsvPrepareStream extends stream.Transform {
  constructor({ header }) {
    super({ objectMode: true });
    this.structure = null;
    this.header = header;
  }
  _transform(chunk, encoding, done) {
    if (this.structure) {
      this.push(
        zipObject(
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
          zipObject(
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
  const csvStream = csv.parse({
    // @ts-ignore
    delimiter,
    skip_lines_with_error: true,
    to_line: limitRows ? limitRows + 1 : undefined,
  });
  const downloadedFile = await dbgateApi.download(fileName);
  const fileStream = fs.createReadStream(downloadedFile, encoding);
  const csvPrepare = new CsvPrepareStream({ header });
  fileStream.pipe(csvStream);
  csvStream.pipe(csvPrepare);
  return csvPrepare;
}

reader.initialize = (dbgateEnv) => {
  dbgateApi = dbgateEnv.dbgateApi;
};

module.exports = reader;
