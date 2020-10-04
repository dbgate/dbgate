const path = require('path');
const { jsldir } = require('../utility/directories');
const jsonLinesReader = require('./jsonLinesReader');

function jslDataReader({ jslid }) {
  const fileName = path.join(jsldir(), `${jslid}.jsonl`);
  return jsonLinesReader({ fileName });
}

module.exports = jslDataReader;
