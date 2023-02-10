const fs = require('fs');
const stream = require('stream');
const byline = require('byline');
const { getLogger } = require('dbgate-tools');
const logger = getLogger('changeSetOverJsonLinesReader');

class ParseStream extends stream.Transform {
  constructor({ limitRows, changeSet }) {
    super({ objectMode: true });
    this.limitRows = limitRows;
    this.changeSet = changeSet;
    this.currentRowIndex = 0;
  }
  _transform(chunk, encoding, done) {
    let obj = JSON.parse(chunk);
    if (obj.__isStreamHeader) {
      this.push(obj);
      done();
      return;
    }

    if (!this.limitRows || this.currentRowIndex < this.limitRows) {
      if (this.changeSet.deletes.find(x => x.existingRowIndex == this.currentRowIndex)) {
        obj = null;
      }

      const update = this.changeSet.updates.find(x => x.existingRowIndex == this.currentRowIndex);
      if (update) {
        obj = {
          ...obj,
          ...update.fields,
        };
      }

      if (obj) {
        this.push(obj);
      }
      this.currentRowIndex += 1;
    }
    done();
  }

  _flush(done) {
    for (const insert of this.changeSet.inserts) {
      this.push({
        ...insert.document,
        ...insert.fields,
      });
    }
    done();
  }
}

async function changeSetOverJsonLinesReader({
  fileName,
  encoding = 'utf-8',
  limitRows = undefined,
  changeSet = { inserts: [], updates: [], deletes: [] },
}) {
  logger.info(`Reading file ${fileName} with change set`);

  const fileStream = fs.createReadStream(fileName, encoding);
  const liner = byline(fileStream);
  const parser = new ParseStream({ limitRows, changeSet });
  liner.pipe(parser);
  return parser;
}

module.exports = changeSetOverJsonLinesReader;
