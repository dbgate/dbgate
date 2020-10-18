const path = require('path');
const { jsldir, archivedir } = require('./directories');

function getJslFileName(jslid) {
  const archiveMatch = jslid.match(/^archive:\/\/([^/]+)\/(.*)$/);
  if (archiveMatch) {
    return path.join(archivedir(), archiveMatch[1], `${archiveMatch[2]}.jsonl`);
  }
  return path.join(jsldir(), `${jslid}.jsonl`);
}

module.exports = getJslFileName;
