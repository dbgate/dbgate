// The web server runs for weeks, so jsl, run and uploads must be swept regularly, not only at
// startup, and entries still in use must survive the sweep (cleanDirectory works by mtime).

jest.mock('dbgate-tools', () => ({
  getLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
  assertValidPluginPackageName: jest.fn(),
}));
jest.mock('./platformInfo', () => ({ isForkedApi: false }));
jest.mock('./processArgs', () => ({}));
jest.mock('../shell/consoleObjectWriter', () => ({}));

const fs = require('fs');
const os = require('os');
const path = require('path');

const HOUR = 3600 * 1000;

function makeOld(file) {
  const old = new Date(Date.now() - 3 * HOUR);
  fs.utimesSync(file, old, old);
}

// The sweep does real fs I/O (libuv), which fake timers cannot await: switch to real timers and
// poll with a cap until the sweep has removed the stale entry.
async function waitUntilGone(file) {
  jest.useRealTimers();
  for (let i = 0; i < 100 && fs.existsSync(file); i++) {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

let workspace;

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-clean-'));
  process.env.WORKSPACE_DIR = workspace;
});

afterEach(() => {
  jest.useRealTimers();
  delete process.env.WORKSPACE_DIR;
  fs.rmSync(workspace, { recursive: true, force: true });
});

test('jsl directory is cleaned again after startup', async () => {
  const { jsldir } = require('./directories');
  const dir = jsldir();
  const oldFile = path.join(dir, 'old.jsonl');
  const freshFile = path.join(dir, 'fresh.jsonl');
  fs.writeFileSync(oldFile, 'x');
  fs.writeFileSync(freshFile, 'x');
  makeOld(oldFile);

  await jest.advanceTimersByTimeAsync(11 * 60 * 1000);
  await waitUntilGone(oldFile);

  expect(fs.existsSync(oldFile)).toBe(false);
  expect(fs.existsSync(freshFile)).toBe(true);
});

test('files and directories refreshed with touchInUse survive the sweep', async () => {
  const { rundir } = require('./directories');
  const { touchInUse, keepInUse } = require('./cleanDirectory');
  const dir = rundir();
  const usedFile = path.join(dir, 'used.js');
  const usedDir = path.join(dir, 'running');
  const keptDir = path.join(dir, 'long-job');
  const idleFile = path.join(dir, 'idle.js');
  fs.writeFileSync(usedFile, 'x');
  fs.mkdirSync(usedDir);
  fs.mkdirSync(keptDir);
  fs.writeFileSync(idleFile, 'x');
  for (const f of [usedFile, usedDir, keptDir, idleFile]) makeOld(f);

  touchInUse(usedFile, usedDir);
  const stop = keepInUse([keptDir]);

  await jest.advanceTimersByTimeAsync(11 * 60 * 1000);
  await waitUntilGone(idleFile);
  stop();

  expect(fs.existsSync(usedFile)).toBe(true);
  expect(fs.existsSync(usedDir)).toBe(true);
  expect(fs.existsSync(keptDir)).toBe(true);
  expect(fs.existsSync(idleFile)).toBe(false);
});
