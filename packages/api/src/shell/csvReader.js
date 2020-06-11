const _ = require('lodash');
const csv = require('csv');
const fs = require('fs');
const stream = require('stream');

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
        this.structure = { columns: chunk.map((columnName) => ({ columnName })) };
        this.push(this.structure);
      } else {
        this.structure = { columns: chunk.map((value, index) => ({ columnName: `col${index + 1}` })) };
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

async function csvReader({ fileName, encoding = 'utf-8', header = true, delimiter, quoted }) {
  console.log(`Reading file ${fileName}`);
  const csvStream = csv.parse({
    // @ts-ignore
    delimiter,
    quoted,
  });
  const fileStream = fs.createReadStream(fileName, encoding);
  const csvPrepare = new CsvPrepareStream({ header });
  fileStream.pipe(csvStream);
  csvStream.pipe(csvPrepare);
  return csvPrepare;
}

module.exports = csvReader;
