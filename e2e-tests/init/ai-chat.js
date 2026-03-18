const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const testApiDir = path.join(rootDir, 'test-api');
const aigwmockDir = path.join(rootDir, 'packages', 'aigwmock');
const tmpDataDir = path.resolve(__dirname, '..', 'tmpdata');
const testApiPidFile = path.join(tmpDataDir, 'test-api.pid');
const aigwmockPidFile = path.join(tmpDataDir, 'aigwmock.pid');
const isWindows = process.platform === 'win32';

const dbgateApi = require('dbgate-api');
dbgateApi.initializeApiEnvironment();
const dbgatePluginMysql = require('dbgate-plugin-mysql');
dbgateApi.registerPlugins(dbgatePluginMysql);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- MySQL setup (same as charts init) ---

async function initMySqlDatabase(dbname, inputFile) {
  const connection = {
    server: process.env.SERVER_mysql,
    user: process.env.USER_mysql,
    password: process.env.PASSWORD_mysql,
    port: process.env.PORT_mysql,
    engine: 'mysql@dbgate-plugin-mysql',
  };

  await dbgateApi.executeQuery({
    connection,
    sql: `DROP DATABASE IF EXISTS ${dbname}`,
  });

  await dbgateApi.executeQuery({
    connection,
    sql: `CREATE DATABASE ${dbname}`,
  });

  await dbgateApi.importDatabase({
    connection: { ...connection, database: dbname },
    inputFile,
  });
}

// --- Process management helpers ---

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

function stopProcess(pidFile) {
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
    // ignore stale pid or already terminated
  }
  try {
    fs.unlinkSync(pidFile);
  } catch (err) {
    // ignore
  }
}

function ensureDependencies(dir, checkFile) {
  if (fs.existsSync(checkFile)) return;
  const command = isWindows ? 'cmd.exe' : 'yarn';
  const args = isWindows ? ['/c', 'yarn install --silent'] : ['install', '--silent'];
  const result = spawnSync(command, args, {
    cwd: dir,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`DBGM-00297 Failed to install dependencies in ${dir}`);
  }
}

function startBackgroundProcess(dir, pidFile, port) {
  const command = isWindows ? 'cmd.exe' : 'yarn';
  const args = isWindows ? ['/c', 'yarn start'] : ['start'];
  const child = spawn(command, args, {
    cwd: dir,
    env: { ...process.env, PORT: String(port) },
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

async function waitForReady(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (err) {
      // continue waiting
    }
    await delay(500);
  }
  throw new Error(`DBGM-00305 Server at ${url} did not start in time`);
}

// --- Main ---

async function run() {
  // 1. Set up MyChinook MySQL database
  console.log('[ai-chat init] Setting up MyChinook database...');
  await initMySqlDatabase('MyChinook', path.resolve(path.join(__dirname, '../data/chinook-mysql.sql')));

  // 2. Start test-api (GraphQL/REST server on port 4444)
  console.log('[ai-chat init] Starting test-api on port 4444...');
  stopProcess(testApiPidFile);
  ensureDependencies(testApiDir, path.join(testApiDir, 'node_modules', 'swagger-jsdoc', 'package.json'));
  startBackgroundProcess(testApiDir, testApiPidFile, 4444);
  await waitForReady('http://localhost:4444/openapi.json');
  console.log('[ai-chat init] test-api is ready');

  // 3. Start aigwmock (AI Gateway mock on port 3110)
  console.log('[ai-chat init] Starting aigwmock on port 3110...');
  stopProcess(aigwmockPidFile);
  ensureDependencies(aigwmockDir, path.join(aigwmockDir, 'node_modules', 'express', 'package.json'));
  startBackgroundProcess(aigwmockDir, aigwmockPidFile, 3110);
  await waitForReady('http://localhost:3110/openrouter/v1/models');
  console.log('[ai-chat init] aigwmock is ready');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
