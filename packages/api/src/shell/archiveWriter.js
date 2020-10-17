const path = require('path');
const { archivedir, ensureDirectory } = require('../utility/directories');
// const socket = require('../utility/socket');
const jsonLinesWriter = require('./jsonLinesWriter');

function archiveWriter({ folderName, fileName }) {
  if (folderName == 'default') ensureDirectory(path.join(archivedir(), folderName));
  const jsonlFile = path.join(archivedir(), folderName, `${fileName}.jsonl`);
  const res = jsonLinesWriter({ fileName: jsonlFile });
  // socket.emitChanged(`archive-files-changed-${folderName}`);
  return res;
}

module.exports = archiveWriter;
