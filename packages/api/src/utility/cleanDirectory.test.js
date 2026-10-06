const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const cleanDirectory = require('./cleanDirectory');

const HOUR = 3600 * 1000;

async function makeStale(target, ageMs) {
  const past = new Date(Date.now() - ageMs);
  await fs.utimes(target, past, past);
}

describe('cleanDirectory', () => {
  let workdir;

  beforeEach(async () => {
    workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'dbgate-clean-directory-'));
  });

  afterEach(async () => {
    await fs.rm(workdir, { recursive: true, force: true });
  });

  test('removes an expired non-empty directory', async () => {
    // Regression: this used fs.rmdir(path, { recursive: true }), which is end-of-life
    // since Node 25 (DEP0147) and throws ERR_INVALID_ARG_VALUE instead of removing.
    // cleanDirectory runs on startup, so the whole API failed to boot.
    const stale = path.join(workdir, 'stale-run');
    await fs.mkdir(path.join(stale, 'nested'), { recursive: true });
    await fs.writeFile(path.join(stale, 'nested', 'script.js'), 'console.log(1)');
    await makeStale(stale, 2 * HOUR);

    await cleanDirectory(workdir);

    await expect(fs.access(stale)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('removes an expired file', async () => {
    const stale = path.join(workdir, 'stale.jsonl');
    await fs.writeFile(stale, '{}');
    await makeStale(stale, 2 * HOUR);

    await cleanDirectory(workdir);

    await expect(fs.access(stale)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('keeps entries which are not expired yet', async () => {
    const fresh = path.join(workdir, 'fresh-run');
    await fs.mkdir(fresh);
    await fs.writeFile(path.join(fresh, 'data.jsonl'), '{}');
    const freshFile = path.join(workdir, 'fresh.jsonl');
    await fs.writeFile(freshFile, '{}');

    await cleanDirectory(workdir);

    await expect(fs.access(fresh)).resolves.toBeUndefined();
    await expect(fs.access(freshFile)).resolves.toBeUndefined();
  });

  test('respects the explicit age argument', async () => {
    const target = path.join(workdir, 'logs-day-old');
    await fs.mkdir(target);
    await makeStale(target, 25 * HOUR);

    // kept with a 7 day age, removed with a 1 hour age
    await cleanDirectory(workdir, 7 * 24 * 3600);
    await expect(fs.access(target)).resolves.toBeUndefined();

    await cleanDirectory(workdir, 3600);
    await expect(fs.access(target)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
