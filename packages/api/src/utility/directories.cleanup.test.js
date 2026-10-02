const path = require('path');
const fs = require('fs');
const os = require('os');

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-temp-clean-'));
process.env.WORKSPACE_DIR = workspace;

const { jsldir, rundir, uploadsdir, filesdir, cleanTempDirectories } = require('./directories');

function writeAgedFile(dir, name, ageMs) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, 'x');
  const when = new Date(Date.now() - ageMs);
  fs.utimesSync(file, when, when);
  return file;
}

afterAll(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('cleanTempDirectories', () => {
  test('removes stale jsl/run/uploads files after the first ensureDirectory call', async () => {
    const jsl = jsldir();
    const run = rundir();
    const uploads = uploadsdir();
    const files = filesdir();

    const staleJsl = writeAgedFile(jsl, 'stale.jsonl', 2 * 3600 * 1000);
    const freshJsl = writeAgedFile(jsl, 'fresh.jsonl', 60 * 1000);
    const staleRun = writeAgedFile(run, 'stale-run', 2 * 3600 * 1000);
    const staleUpload = writeAgedFile(uploads, 'stale-upload', 2 * 3600 * 1000);
    const userFile = writeAgedFile(files, 'keep-me', 2 * 3600 * 1000);

    // The first jsldir()/rundir()/uploadsdir() already ran ensureDirectory,
    // so a later touch would not clean. The periodic sweep must still do it.
    jsldir();
    rundir();
    uploadsdir();

    await cleanTempDirectories();

    expect(fs.existsSync(staleJsl)).toBe(false);
    expect(fs.existsSync(freshJsl)).toBe(true);
    expect(fs.existsSync(staleRun)).toBe(false);
    expect(fs.existsSync(staleUpload)).toBe(false);
    expect(fs.existsSync(userFile)).toBe(true);
  });
});
