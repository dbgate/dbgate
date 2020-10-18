const getJslFileName = require('../utility/getJslFileName');
const jsonLinesReader = require('./jsonLinesReader');

function jslDataReader({ jslid }) {
  const fileName = getJslFileName(jslid);
  return jsonLinesReader({ fileName });
}

module.exports = jslDataReader;
