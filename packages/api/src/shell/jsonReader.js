const fs = require('fs');
const stream = require('stream');
const byline = require('byline');
const { getLogger } = require('dbgate-tools');
const { parser } = require('stream-json');
const { pick } = require('stream-json/filters/Pick');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { streamObject } = require('stream-json/streamers/StreamObject');
const download = require('./download');

const logger = getLogger('jsonReader');


class ParseStream extends stream.Transform {
  constructor({ limitRows, jsonStyle, keyField }) {
    super({ objectMode: true });
    this.wasHeader = false;
    this.limitRows = limitRows;
    this.jsonStyle = jsonStyle;
    this.keyField = keyField || '_key';
    this.rowsWritten = 0;
  }
  _transform(chunk, encoding, done) {
    if (!this.wasHeader) {
      this.push({
        __isStreamHeader: true,
        __isDynamicStructure: true,
      });

      this.wasHeader = true;
    }
    if (!this.limitRows || this.rowsWritten < this.limitRows) {
      if (this.jsonStyle === 'object') {
        this.push({
          ...chunk.value,
          [this.keyField]: chunk.key,
        });
      } else {
        this.push(chunk.value);
      }

      this.rowsWritten += 1;
    }
    done();
  }
}

async function jsonReader({
  fileName,
  jsonStyle,
  keyField = '_key',
  rootField = null,
  encoding = 'utf-8',
  limitRows = undefined,
}) {
  logger.info(`Reading file ${fileName}`);

  const downloadedFile = await download(fileName);
  const fileStream = fs.createReadStream(
    downloadedFile,
    // @ts-ignore
    encoding
  );
  const parseJsonStream = parser();
  fileStream.pipe(parseJsonStream);

  const parseStream = new ParseStream({ limitRows, jsonStyle, keyField });

  const tramsformer = jsonStyle === 'object' ? streamObject() : streamArray();

  if (rootField) {
    const filterStream = pick({ filter: rootField });
    parseJsonStream.pipe(filterStream);
    filterStream.pipe(tramsformer);
  } else {
    parseJsonStream.pipe(tramsformer);
  }

  tramsformer.pipe(parseStream);

  return parseStream;
}

module.exports = jsonReader;
