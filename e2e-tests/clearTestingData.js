const path = require('path');
const os = require('os');
const fs = require('fs');

const baseDir = path.join(os.homedir(), '.dbgate');
const testApiPidFile = path.join(__dirname, 'tmpdata', 'test-api.pid');

function clearTestingData() {
  if (fs.existsSync(testApiPidFile)) {
    try {
      const pid = Number(fs.readFileSync(testApiPidFile, 'utf-8'));
      if (Number.isInteger(pid) && pid > 0) {
        process.kill(pid);
      }
    } catch (err) {
      // ignore stale PID files and dead processes
    }

    try {
      fs.unlinkSync(testApiPidFile);
    } catch (err) {
      // ignore cleanup errors
    }
  }

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
