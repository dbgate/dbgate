const fs = require('fs');
const stream = require('stream');
const { getLogger } = global.DBGATE_PACKAGES['dbgate-tools'];

const logger = getLogger('xmlWriter');

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
    }
  });
}

class StringifyStream extends stream.Transform {
  constructor({ itemElementName, rootElementName }) {
    super({ objectMode: true });
    this.itemElementName = itemElementName || 'row';
    this.rootElementName = rootElementName || 'root';

    this.startElement(this.rootElementName);
    this.push('\n');
  }

  startElement(element) {
    this.push('<');
    this.push(element);
    this.push('>');
  }

  endElement(element) {
    this.push('</');
    this.push(element);
    this.push('>\n');
  }

  elementValue(element, value) {
    this.startElement(element);
    if (value?.$binary?.base64) {
      const buffer = Buffer.from(value.$binary.base64, 'base64');
      value = '0x' +buffer.toString('hex').toUpperCase();
    }
    this.push(escapeXml(`${value}`));
    this.endElement(element);
  }

  _transform(chunk, encoding, done) {
    if (chunk.__isStreamHeader) {
      done();
      return;
    }
    this.startElement(this.itemElementName);
    this.push('\n');
    for (const key of Object.keys(chunk)) {
      this.elementValue(key, chunk[key]);
    }
    this.endElement(this.itemElementName);
    done();
  }

  _final(callback) {
    this.endElement(this.rootElementName);
    callback();
  }
}

async function writer({ fileName, encoding = 'utf-8', itemElementName, rootElementName }) {
  logger.info(`DBGM-00144 Writing file ${fileName}`);
  const stringify = new StringifyStream({ itemElementName, rootElementName });
  const fileStream = fs.createWriteStream(fileName, encoding);
  return [stringify, fileStream];
  // stringify.pipe(fileStream);
  // stringify['finisher'] = fileStream;
  // return stringify;
}

module.exports = writer;
