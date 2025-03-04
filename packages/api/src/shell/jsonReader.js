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

/**
 * Creates reader object for JSON file for {@link copyStream} function.
 * @param {object} options
 * @param {string} options.fileName - file name or URL
 * @param {string} options.jsonStyle - 'object' or 'array'
 * @param {string} [options.keyField] - key field for object style
 * @param {string} [options.rootField] - root field for object style
 * @param {string} [options.encoding] - encoding of the file
 * @param {number} [options.limitRows] - maximum number of rows to read
 * @returns {Promise<readerType>} - reader object
 */
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

  const resultPipe = [fileStream, parseJsonStream];

  // fileStream.pipe(parseJsonStream);

  const parseStream = new ParseStream({ limitRows, jsonStyle, keyField });

  const tramsformer = jsonStyle === 'object' ? streamObject() : streamArray();

  if (rootField) {
    const filterStream = pick({ filter: rootField });
    resultPipe.push(filterStream);
    // parseJsonStream.pipe(filterStream);
    // filterStream.pipe(tramsformer);
  }
  // else {
  //   parseJsonStream.pipe(tramsformer);
  // }

  resultPipe.push(tramsformer);
  resultPipe.push(parseStream);

  // tramsformer.pipe(parseStream);

  return resultPipe;
}

module.exports = jsonReader;
