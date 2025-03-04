const fs = require('fs');
const _ = require('lodash');
const stream = require('stream');
const byline = require('byline');
const { getLogger, processJsonDataUpdateCommands, removeTablePairingId } = require('dbgate-tools');
const logger = getLogger('modifyJsonLinesReader');
const stableStringify = require('json-stable-stringify');

class ParseStream extends stream.Transform {
  constructor({ limitRows, changeSet, mergedRows, mergeKey, mergeMode }) {
    super({ objectMode: true });
    this.limitRows = limitRows;
    this.changeSet = changeSet;
    this.wasHeader = false;
    this.currentRowIndex = 0;
    if (mergeMode == 'merge') {
      if (mergedRows && mergeKey) {
        this.mergedRowsDict = {};
        for (const row of mergedRows) {
          const key = stableStringify(_.pick(row, mergeKey));
          this.mergedRowsDict[key] = row;
        }
      }
    }
    this.mergedRowsArray = mergedRows;
    this.mergeKey = mergeKey;
    this.mergeMode = mergeMode;
  }
  _transform(chunk, encoding, done) {
    let obj = JSON.parse(chunk);
    if (obj.__isStreamHeader) {
      if (this.changeSet && this.changeSet.structure) {
        this.push({
          ...removeTablePairingId(this.changeSet.structure),
          __isStreamHeader: true,
        });
      } else {
        this.push(obj);
      }
      this.wasHeader = true;
      done();
      return;
    }

    if (this.changeSet) {
      if (!this.wasHeader && this.changeSet.structure) {
        this.push({
          ...removeTablePairingId(this.changeSet.structure),
          __isStreamHeader: true,
        });
        this.wasHeader = true;
      }

      if (!this.limitRows || this.currentRowIndex < this.limitRows) {
        if (this.changeSet.deletes.find(x => x.existingRowIndex == this.currentRowIndex)) {
          obj = null;
        }

        const update = this.changeSet.updates.find(x => x.existingRowIndex == this.currentRowIndex);
        if (update) {
          if (update.document) {
            obj = update.document;
          } else {
            obj = _.omitBy(
              {
                ...obj,
                ...update.fields,
              },
              (v, k) => v?.$$undefined$$
            );
          }
        }

        if (obj) {
          if (this.changeSet.dataUpdateCommands) {
            obj = processJsonDataUpdateCommands(obj, this.changeSet.dataUpdateCommands);
          }
          this.push(obj);
        }
        this.currentRowIndex += 1;
      }
    } else if (this.mergedRowsArray && this.mergeKey && this.mergeMode) {
      if (this.mergeMode == 'merge') {
        const key = stableStringify(_.pick(obj, this.mergeKey));
        if (this.mergedRowsDict[key]) {
          this.push({ ...obj, ...this.mergedRowsDict[key] });
          delete this.mergedRowsDict[key];
        } else {
          this.push(obj);
        }
      } else if (this.mergeMode == 'append') {
        this.push(obj);
      }
    } else {
      this.push(obj);
    }
    done();
  }

  _flush(done) {
    if (this.changeSet) {
      for (const insert of this.changeSet.inserts) {
        this.push({
          ...insert.document,
          ...insert.fields,
        });
      }
    } else if (this.mergedRowsArray && this.mergeKey) {
      if (this.mergeMode == 'merge') {
        for (const row of this.mergedRowsArray) {
          const key = stableStringify(_.pick(row, this.mergeKey));
          if (this.mergedRowsDict[key]) {
            this.push(row);
          }
        }
      } else {
        for (const row of this.mergedRowsArray) {
          this.push(row);
        }
      }
    }
    done();
  }
}

async function modifyJsonLinesReader({
  fileName,
  encoding = 'utf-8',
  limitRows = undefined,
  changeSet = null,
  mergedRows = null,
  mergeKey = null,
  mergeMode = 'merge',
}) {
  logger.info(`Reading file ${fileName} with change set`);

  const fileStream = fs.createReadStream(
    fileName,
    // @ts-ignore
    encoding
  );
  const liner = byline(fileStream);
  const parser = new ParseStream({ limitRows, changeSet, mergedRows, mergeKey, mergeMode });
  return [liner, parser];
  // liner.pipe(parser);
  // return parser;
}

module.exports = modifyJsonLinesReader;
