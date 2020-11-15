const getJslFileName = require('../utility/getJslFileName');
const jsonLinesReader = require('./jsonLinesReader');

function jslDataReader({ jslid, ...other }) {
  const fileName = getJslFileName(jslid);
  return jsonLinesReader({ fileName, ...other });
}

module.exports = jslDataReader;
