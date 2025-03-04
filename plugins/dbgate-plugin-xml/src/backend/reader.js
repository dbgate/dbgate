const fs = require('fs');
const stream = require('stream');
const NodeXmlStream = require('node-xml-stream-parser');
const { getLogger } = global.DBGATE_PACKAGES['dbgate-tools'];

const logger = getLogger('xmlReader');

class ParseStream extends stream.Transform {
  constructor({ itemElementName }) {
    super({ objectMode: true });

    let element = itemElementName;

    this.push({
      __isStreamHeader: true,
      __isDynamicStructure: true,
    });

    this.rowsWritten = 0;
    this.parser = new NodeXmlStream();
    this.stack = [];
    this.parser.on('opentag', (name, attrs) => {
      if (!element && this.stack.length == 1) {
        element = name;
      }
      this.stack.push({ name, attrs, nodes: {} });
    });
    this.parser.on('text', (text) => {
      if (this.stack.length >= 2) {
        this.stack[this.stack.length - 2].nodes[this.stack[this.stack.length - 1].name] = text;
      }
      if (this.stack.length >= 1) {
        this.stack[this.stack.length - 1].nodes.$text = text;
      }
    });
    this.parser.on('cdata', (text) => {
      if (this.stack.length >= 2) {
        this.stack[this.stack.length - 2].nodes[this.stack[this.stack.length - 1].name] = text;
      }
      if (this.stack.length >= 1) {
        this.stack[this.stack.length - 1].nodes.$text = text;
      }
    });
    this.parser.on('closetag', (name, attrs) => {
      if (name == element) {
        const obj = { ...this.stack[this.stack.length - 1].attrs, ...this.stack[this.stack.length - 1].nodes };
        if (Object.keys(obj).length > 0) {
          this.rowsWritten += 1;
          this.push(obj);
        }
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
  logger.info(`Reading file ${fileName}`);

  const fileStream = fs.createReadStream(fileName, encoding);
  const parser = new ParseStream({ itemElementName });

  return [fileStream, parser];
  // fileStream.pipe(parser);
  // return parser;
}

module.exports = reader;
