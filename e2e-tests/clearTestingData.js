const path = require('path');
const os = require('os');
const fs = require('fs');

const baseDir = path.join(os.homedir(), '.dbgate');
const testApiPidFile = path.join(__dirname, 'tmpdata', 'test-api.pid');
const aigwmockPidFile = path.join(__dirname, 'tmpdata', 'aigwmock.pid');

function readProcessStartTime(pid) {
  if (process.platform === 'linux') {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf-8');
      return stat.split(' ')[21] || null;
    } catch (err) {
      return null;
    }
  }
  return null;
}

function isPidStillOurs(meta) {
  if (!meta || !(meta.pid > 0)) return false;
  if (process.platform === 'linux' && meta.startTime) {
    const current = readProcessStartTime(meta.pid);
    return current === meta.startTime;
  }
  return true;
}

function stopProcessByPidFile(pidFile) {
  if (!fs.existsSync(pidFile)) return;
  try {
    const content = fs.readFileSync(pidFile, 'utf-8').trim();
    let meta;
    try {
      meta = JSON.parse(content);
    } catch (_) {
      const pid = Number(content);
      meta = Number.isInteger(pid) && pid > 0 ? { pid } : null;
    }
    if (isPidStillOurs(meta)) {
      process.kill(meta.pid);
    }
  } catch (err) {
    // ignore stale PID files and dead processes
  }
  try {
    fs.unlinkSync(pidFile);
  } catch (err) {
    // ignore cleanup errors
  }
}

function clearTestingData() {
  stopProcessByPidFile(testApiPidFile);
  stopProcessByPidFile(aigwmockPidFile);

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
