const path = require('path');
const os = require('os');
const fs = require('fs');

const baseDir = path.join(os.homedir(), '.dbgate');

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
  if (fs.existsSync(path.join(__dirname, 'tmpdata', 'my_guitar_shop.db'))) {
    fs.unlinkSync(path.join(__dirname, 'tmpdata', 'my_guitar_shop.db'));
  }
}

clearTestingData();
