const path = require('path');
const os = require('os');
const fs = require('fs');

const baseDir = path.join(os.homedir(), '.dbgate');

function createTimeStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // měsíc je 0-indexovaný
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Poskládáme datum a čas do názvu souboru
  const ts = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  return ts;
}

if (fs.existsSync(path.join(baseDir, 'connections.jsonl'))) {
  fs.renameSync(
    path.join(baseDir, 'connections.jsonl'),
    path.join(baseDir, `connections-${createTimeStamp()}.jsonl.bak`)
  );
}
