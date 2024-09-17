const { getLogger } = require('dbgate-tools');
const fs = require('fs');
const stream = require('stream');
const _ = require('lodash');

const logger = getLogger('jsonArrayWriter');

class StringifyStream extends stream.Transform {
  constructor({ jsonStyle, keyField, rootField }) {
    super({ objectMode: true });
    this.wasHeader = false;
    this.wasRecord = false;
    this.jsonStyle = jsonStyle;
    this.keyField = keyField || '_key';
    this.rootField = rootField;
  }
  _transform(chunk, encoding, done) {
    let skip = false;

    if (!this.wasHeader) {
      skip = chunk.__isStreamHeader;
      this.wasHeader = true;
    }
    if (!skip) {
      if (!this.wasRecord) {
        if (this.rootField) {
          if (this.jsonStyle === 'object') {
            this.push(`{"${this.rootField}": {\n`);
          } else {
            this.push(`{"${this.rootField}": [\n`);
          }
        } else {
          if (this.jsonStyle === 'object') {
            this.push('{\n');
          } else {
            this.push('[\n');
          }
        }
      } else {
        this.push(',\n');
      }
      this.wasRecord = true;

      if (this.jsonStyle === 'object') {
        const key = chunk[this.keyField] ?? chunk[Object.keys(chunk)[0]];
        this.push(`"${key}": ${JSON.stringify(_.omit(chunk, [this.keyField]))}`);
      } else {
        this.push(JSON.stringify(chunk));
      }
    }
    done();
  }

  _flush(done) {
    if (!this.wasRecord) {
      if (this.rootField) {
        if (this.jsonStyle === 'object') {
          this.push(`{"${this.rootField}": {}}\n`);
        } else {
          this.push(`{"${this.rootField}": []}\n`);
        }
      } else {
        if (this.jsonStyle === 'object') {
          this.push('{}\n');
        } else {
          this.push('[]\n');
        }
      }
    } else {
      if (this.rootField) {
        if (this.jsonStyle === 'object') {
          this.push('\n}}\n');
        } else {
          this.push('\n]}\n');
        }
      } else {
        if (this.jsonStyle === 'object') {
          this.push('\n}\n');
        } else {
          this.push('\n]\n');
        }
      }
    }
    done();
  }
}

async function jsonWriter({ fileName, jsonStyle, keyField = '_key', rootField, encoding = 'utf-8' }) {
  logger.info(`Writing file ${fileName}`);
  const stringify = new StringifyStream({ jsonStyle, keyField, rootField });
  const fileStream = fs.createWriteStream(fileName, encoding);
  stringify.pipe(fileStream);
  stringify['finisher'] = fileStream;
  return stringify;
}

module.exports = jsonWriter;
