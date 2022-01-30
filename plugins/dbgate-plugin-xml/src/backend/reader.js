const fs = require('fs');
const stream = require('stream');
const NodeXmlStream = require('node-xml-stream');

class ParseStream extends stream.Transform {
  constructor({ itemElementName }) {
    super({ objectMode: true });
    this.rowsWritten = 0;
    this.parser = new NodeXmlStream();
    this.stack = [];
    this.parser.on('opentag', (name, attrs) => {
      this.stack.push({ name, attrs, nodes: {} });
    });
    this.parser.on('text', (text) => {
      if (this.stack.length >= 2) {
        this.stack[this.stack.length - 2].nodes[this.stack[this.stack.length - 1].name] = text;
      }
    });
    this.parser.on('closetag', (name, attrs) => {
      if (name == itemElementName) {
        this.rowsWritten += 1;
        this.push({ ...this.stack[this.stack.length - 1].attrs, ...this.stack[this.stack.length - 1].nodes });
      }
      this.stack.splice(-1);
    });
  }
  _transform(chunk, encoding, done) {
    this.parser.write(chunk);
    done();
  }
}

async function reader({ fileName, encoding = 'utf-8', itemElementName }) {
  console.log(`Reading file ${fileName}`);

  const fileStream = fs.createReadStream(fileName, encoding);
  const parser = new ParseStream({ itemElementName });
  fileStream.pipe(parser);
  return parser;
}

module.exports = reader;
