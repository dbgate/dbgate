const { getLogger } = require('dbgate-tools');
const fs = require('fs');
const stream = require('stream');
const logger = getLogger('jsonLinesWriter');

class StringifyStream extends stream.Transform {
  constructor({ header }) {
    super({ objectMode: true });
    this.header = header;
    this.wasHeader = false;
  }
  _transform(chunk, encoding, done) {
    let skip = false;
    if (!this.wasHeader) {
      skip =
        (chunk.__isStreamHeader && !this.header) ||
        (chunk.__isStreamHeader && chunk.__isDynamicStructure && !chunk.__keepDynamicStreamHeader);
      this.wasHeader = true;
    }
    if (!skip) {
      this.push(JSON.stringify(chunk) + '\n');
    }
    done();
  }
}

/**
 * Returns writer object for {@link copyStream} function. This writer object writes data to JSONL file. JSONL format - text file, every line is JSON encoded row, used eg. by MongoDB.
 * @param {object} options
 * @param {string} options.fileName - file name
 * @param {string} [options.encoding] - encoding of the file
 * @param {boolean} [options.header] - whether to write header. Header is JSON describing source table structure. Header is specific to DbGate, if you want eg. to import data to MongoDB, you should not write header.
 * @returns {Promise<writerType>} - writer object
 */
async function jsonLinesWriter({ fileName, encoding = 'utf-8', header = true }) {
  logger.info(`Writing file ${fileName}`);
  const stringify = new StringifyStream({ header });
  const fileStream = fs.createWriteStream(fileName, encoding);
  stringify.pipe(fileStream);
  stringify['finisher'] = fileStream;
  return stringify;
}

module.exports = jsonLinesWriter;
