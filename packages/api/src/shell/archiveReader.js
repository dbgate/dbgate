const path = require('path');
const { archivedir, resolveArchiveFolder } = require('../utility/directories');
const jsonLinesReader = require('./jsonLinesReader');

function archiveReader({ folderName, fileName, ...other }) {
  const jsonlFile = path.join(resolveArchiveFolder(folderName), `${fileName}.jsonl`);
  const res = jsonLinesReader({ fileName: jsonlFile, ...other });
  return res;
}

module.exports = archiveReader;
