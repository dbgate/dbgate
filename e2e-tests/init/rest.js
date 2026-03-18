const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const testApiDir = path.join(rootDir, 'test-api');
const pidFile = path.resolve(__dirname, '..', 'tmpdata', 'test-api.pid');
const isWindows = process.platform === 'win32';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForApiReady(timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch('http://localhost:4444/openapi.json');
      if (response.ok) {
        return;
      }
    } catch (err) {
      // continue waiting
    }

    await delay(500);
  }

  throw new Error('DBGM-00306 test-api did not start on port 4444 in time');
}

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

function stopPreviousTestApi() {
  if (!fs.existsSync(pidFile)) {
    return;
  }

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
    // ignore stale pid file or already terminated process
  }

  try {
    fs.unlinkSync(pidFile);
  } catch (err) {
    // ignore
  }
}

function startTestApi() {
  const command = isWindows ? 'cmd.exe' : 'yarn';
  const args = isWindows ? ['/c', 'yarn start'] : ['start'];

  const child = spawn(command, args, {
    cwd: testApiDir,
    env: {
      ...process.env,
      PORT: '4444',
    },
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  const meta = { pid: child.pid };
  const startTime = readProcessStartTime(child.pid);
  if (startTime) meta.startTime = startTime;
  fs.writeFileSync(pidFile, JSON.stringify(meta));
}

function ensureTestApiDependencies() {
  const dependencyCheckFile = path.join(testApiDir, 'node_modules', 'swagger-jsdoc', 'package.json');
  if (fs.existsSync(dependencyCheckFile)) {
    return;
  }

  const installCommand = isWindows ? 'cmd.exe' : 'yarn';
  const installArgs = isWindows ? ['/c', 'yarn install --silent'] : ['install', '--silent'];
  const result = spawnSync(installCommand, installArgs, {
    cwd: testApiDir,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error('DBGM-00307 Failed to install test-api dependencies');
  }
}

async function run() {
  stopPreviousTestApi();
  ensureTestApiDependencies();
  startTestApi();
  await waitForApiReady();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
