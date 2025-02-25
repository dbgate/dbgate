const path = require('path');
const os = require('os');
const fs = require('fs');

const baseDir = path.join(os.homedir(), '.dbgate');

// function createTimeStamp() {
//   const now = new Date();
//   const year = now.getFullYear();
//   const month = String(now.getMonth() + 1).padStart(2, '0'); // měsíc je 0-indexovaný
//   const day = String(now.getDate()).padStart(2, '0');
//   const hours = String(now.getHours()).padStart(2, '0');
//   const minutes = String(now.getMinutes()).padStart(2, '0');
//   const seconds = String(now.getSeconds()).padStart(2, '0');

//   // Poskládáme datum a čas do názvu souboru
//   const ts = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
//   return ts;
// }

function clearTestingData() {
  if (fs.existsSync(path.join(baseDir, 'connections-e2etests.jsonl'))) {
    fs.unlinkSync(path.join(baseDir, 'connections-e2etests.jsonl'));
  }
  if (fs.existsSync(path.join(baseDir, 'settings-e2etests.json'))) {
    fs.unlinkSync(path.join(baseDir, 'settings-e2etests.json'));
  }
  if (fs.existsSync(path.join(baseDir, 'files-e2etests'))) {
    fs.rmdirSync(path.join(baseDir, 'files-e2etests'), { recursive: true });
  }
  if (fs.existsSync(path.join(baseDir, 'archive-e2etests'))) {
    fs.rmdirSync(path.join(baseDir, 'archive-e2etests'), { recursive: true });
  }
}

module.exports = {
  clearTestingData,
};
