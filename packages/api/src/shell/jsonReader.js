const fs = require('fs');
const stream = require('stream');
const byline = require('byline');
const { getLogger } = require('dbgate-tools');
const logger = getLogger('jsonReader');
const { parser } = require('stream-json');
const { pick } = require('stream-json/filters/Pick');
const { streamArray } = require('stream-json/streamers/StreamArray');

class ParseStream extends stream.Transform {
  constructor({ limitRows }) {
    super({ objectMode: true });
    this.wasHeader = false;
    this.limitRows = limitRows;
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
      this.push(chunk.value);
      this.rowsWritten += 1;
    }
    done();
  }
}

async function jsonReader({ fileName, encoding = 'utf-8', limitRows = undefined }) {
  logger.info(`Reading file ${fileName}`);

  const fileStream = fs.createReadStream(
    fileName,
    // @ts-ignore
    encoding
  );
  const parseJsonStream = parser();
  fileStream.pipe(parseJsonStream);

  const { streamArray } = require('stream-json/streamers/StreamArray');
  const streamArrayStream = streamArray();

  parseJsonStream.pipe(streamArrayStream);

  const parseStream = new ParseStream({ limitRows });

  streamArrayStream.pipe(parseStream);

  return parseStream;
}

module.exports = jsonReader;
