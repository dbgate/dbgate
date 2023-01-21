const { getLogger } = require('dbgate-tools');
const fs = require('fs');
const stream = require('stream');
const logger = getLogger();

class StringifyStream extends stream.Transform {
  constructor({ header }) {
    super({ objectMode: true });
    this.header = header;
    this.wasHeader = false;
  }
  _transform(chunk, encoding, done) {
    let skip = false;
    if (!this.wasHeader) {
      skip = (chunk.__isStreamHeader && !this.header) || (chunk.__isStreamHeader && chunk.__isDynamicStructure);
      this.wasHeader = true;
    }
    if (!skip) {
      this.push(JSON.stringify(chunk) + '\n');
    }
    done();
  }
}

async function jsonLinesWriter({ fileName, encoding = 'utf-8', header = true }) {
  logger.info(`Writing file ${fileName}`);
  const stringify = new StringifyStream({ header });
  const fileStream = fs.createWriteStream(fileName, encoding);
  stringify.pipe(fileStream);
  stringify['finisher'] = fileStream;
  return stringify;
}

module.exports = jsonLinesWriter;
