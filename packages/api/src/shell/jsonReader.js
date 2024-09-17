const fs = require('fs');
const stream = require('stream');
const byline = require('byline');
const { getLogger } = require('dbgate-tools');
const logger = getLogger('jsonReader');
const { parser } = require('stream-json');
const { pick } = require('stream-json/filters/Pick');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { streamObject } = require('stream-json/streamers/StreamObject');

class ParseStream extends stream.Transform {
  constructor({ limitRows, jsonStyle, keyField }) {
    super({ objectMode: true });
    this.wasHeader = false;
    this.limitRows = limitRows;
    this.jsonStyle = jsonStyle;
    this.keyField = keyField;
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

async function jsonReader({ fileName, jsonStyle, keyField = '_key', encoding = 'utf-8', limitRows = undefined }) {
  logger.info(`Reading file ${fileName}`);

  const fileStream = fs.createReadStream(
    fileName,
    // @ts-ignore
    encoding
  );
  const parseJsonStream = parser();
  fileStream.pipe(parseJsonStream);

  const parseStream = new ParseStream({ limitRows, jsonStyle, keyField });

  if (jsonStyle === 'object') {
    const tramsformer = streamObject();
    parseJsonStream.pipe(tramsformer);
    tramsformer.pipe(parseStream);
  } else {
    const tramsformer = streamArray();
    parseJsonStream.pipe(tramsformer);
    tramsformer.pipe(parseStream);
  }

  return parseStream;
}

module.exports = jsonReader;
