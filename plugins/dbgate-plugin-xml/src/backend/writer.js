const fs = require('fs');
const stream = require('stream');

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
    this.push(escapeXml(`${value}`));
    this.endElement(element);
  }

  _transform(chunk, encoding, done) {
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
  console.log(`Writing file ${fileName}`);
  const stringify = new StringifyStream({ itemElementName, rootElementName });
  const fileStream = fs.createWriteStream(fileName, encoding);
  stringify.pipe(fileStream);
  stringify['finisher'] = fileStream;
  return stringify;
}

module.exports = writer;
