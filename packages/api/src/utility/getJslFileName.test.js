// Regression tests for jslid -> filesystem path resolution.
//
// A jslid is client supplied and the resulting path is written to as well as read from
// (jsldata.saveText, jsldata.saveRows, archive.saveJslData). Two of its forms used to escape
// the managed data directories:
//
//   {"jslid": "file:///etc/cron.d/x", "text": "..."}          -> arbitrary path, verbatim
//   {"jslid": "archive://default/../../../../etc/cron.d/x"}   -> traversal out of the archive
//
// giving arbitrary file write with fully attacker-controlled path and content, as root in the
// official Docker image. Only jsldata.streamRows checked; every other route was open.

const path = require('path');
const fs = require('fs');
const os = require('os');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-jsl-test-'));
const mockDirs = {
  jsl: path.join(root, 'jsl'),
  archive: path.join(root, 'archive'),
  uploads: path.join(root, 'uploads'),
  outside: path.join(root, 'outside'),
};
for (const dir of Object.values(mockDirs)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.mkdirSync(path.join(mockDirs.archive, 'default'), { recursive: true });

jest.mock('./directories', () => {
  const nodePath = require('path');
  return {
    jsldir: () => mockDirs.jsl,
    archivedir: () => mockDirs.archive,
    uploadsdir: () => mockDirs.uploads,
    resolveArchiveFolder: folder => nodePath.join(mockDirs.archive, folder),
  };
});
jest.mock('./platformInfo', () => ({ isElectron: false, isWindows: process.platform == 'win32' }));

const getJslFileName = require('./getJslFileName');
const { openJslFileForWrite, openJslFileForRead } = getJslFileName;
const platformInfo = require('./platformInfo');

const canSymlink = process.platform != 'win32';

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('getJslFileName', () => {
  beforeEach(() => {
    platformInfo.isElectron = false;
  });

  describe('accepts the forms the product actually uses', () => {
    test('a plain jslid resolves inside the jsl directory', () => {
      expect(getJslFileName('abc-123')).toEqual(path.join(mockDirs.jsl, 'abc-123.jsonl'));
    });

    test('an archive jslid resolves inside the archive directory', () => {
      expect(getJslFileName('archive://default/orders')).toEqual(path.join(mockDirs.archive, 'default', 'orders.jsonl'));
    });

    test('an uploaded file is opened as file://<uploadsdir>/<id> by the web client', () => {
      const uploaded = path.join(mockDirs.uploads, '7c8d9e10-1111-4222-8333-444455556666');
      expect(getJslFileName(`file://${uploaded}`)).toEqual(uploaded);
    });
  });

  describe('refuses paths outside the managed data directories', () => {
    test.each([
      ['absolute file:// path', 'file:///etc/cron.d/dbgate'],
      ['absolute file:// path in the temp root', `file://${path.join(mockDirs.outside, 'pwn')}`],
      ['relative file:// path', 'file://../../etc/passwd'],
      ['archive traversal', 'archive://default/../../../../etc/cron.d/dbgate'],
      ['archive traversal with a single step', 'archive://default/../../escaped'],
      ['plain jslid traversal', '../../../../etc/cron.d/dbgate'],
    ])('%s', (_label, jslid) => {
      expect(() => getJslFileName(jslid)).toThrow(/Invalid jslid/);
    });

    test('a symlinked directory planted inside a managed directory cannot redirect the write', () => {
      if (!canSymlink) return;
      const linkDir = path.join(mockDirs.jsl, 'linked');
      fs.symlinkSync(mockDirs.outside, linkDir);
      expect(() => getJslFileName('file://' + path.join(linkDir, 'pwn.jsonl'))).toThrow(/Invalid jslid/);
    });

    // Resolving only the immediate parent left a gap: with the intermediate directories missing
    // too, the whole path fell back to its lexical form and the symlink further up was judged by
    // the name it was reached through.
    test('a symlinked directory is resolved however deep the missing tail below it is', () => {
      if (!canSymlink) return;
      const linkDir = path.join(mockDirs.jsl, 'deep-linked');
      fs.symlinkSync(mockDirs.outside, linkDir);
      expect(() => getJslFileName('file://' + path.join(linkDir, 'new', 'sub', 'pwn.jsonl'))).toThrow(/Invalid jslid/);
    });

    test('a missing tail inside a managed directory is still allowed', () => {
      const wanted = path.join(mockDirs.jsl, 'not-yet', 'nested', 'file.jsonl');
      expect(getJslFileName(`file://${wanted}`)).toEqual(wanted);
    });

    // the final component is resolved too. Judging it by name alone would accept
    // <uploadsdir>/victim.jsonl as "inside uploadsdir" and then let the write follow it out.
    test('a symlinked file planted inside a managed directory cannot redirect the write', () => {
      if (!canSymlink) return;
      const target = path.join(mockDirs.outside, 'cron');
      fs.writeFileSync(target, 'original');
      const link = path.join(mockDirs.uploads, 'victim.jsonl');
      fs.symlinkSync(target, link);
      expect(() => getJslFileName(`file://${link}`)).toThrow(/Invalid jslid/);
    });

    test('a dangling symlink planted inside a managed directory is refused', () => {
      if (!canSymlink) return;
      const link = path.join(mockDirs.uploads, 'dangling.jsonl');
      fs.symlinkSync(path.join(mockDirs.outside, 'does-not-exist-yet'), link);
      // a write through it would create the file it points at, outside the root
      expect(() => getJslFileName(`file://${link}`)).toThrow(/Invalid jslid/);
    });

    test('a dangling symlink standing in for a directory is refused', () => {
      if (!canSymlink) return;
      const link = path.join(mockDirs.uploads, 'dangling-dir');
      fs.symlinkSync(path.join(mockDirs.outside, 'no-such-dir'), link);
      expect(() => getJslFileName('file://' + path.join(link, 'file.jsonl'))).toThrow(/Invalid jslid/);
    });

    test('a symlink that stays inside a managed directory is still allowed', () => {
      if (!canSymlink) return;
      const target = path.join(mockDirs.jsl, 'real.jsonl');
      fs.writeFileSync(target, '');
      const link = path.join(mockDirs.jsl, 'alias.jsonl');
      fs.symlinkSync(target, link);
      expect(getJslFileName(`file://${link}`)).toEqual(link);
    });

    test.each([[undefined], [null], [''], [42], [{}]])('rejects non-string jslid %p', jslid => {
      // @ts-ignore - deliberately wrong types, these arrive straight from a JSON body
      expect(() => getJslFileName(jslid)).toThrow(/Invalid jslid/);
    });
  });

  describe('openJslFileForWrite', () => {
    test('creates and truncates a normal file', async () => {
      const file = path.join(mockDirs.jsl, 'written.jsonl');
      fs.writeFileSync(file, 'stale content that must not survive');
      const handle = await openJslFileForWrite('file://' + file);
      await handle.writeFile('fresh');
      await handle.close();
      expect(fs.readFileSync(file, 'utf-8')).toEqual('fresh');
    });

    // The canonical path is what gets opened, so a symlink the check has already vouched for -
    // one resolving inside a managed root - is resolved away before the open rather than
    // refused by it, the same way a read through that path behaves. O_NOFOLLOW is left guarding
    // the window between this canonicalization and the open.
    test('follows a symlink that resolves inside a managed directory', async () => {
      if (!canSymlink) return;
      const target = path.join(mockDirs.jsl, 'nofollow-target.jsonl');
      fs.writeFileSync(target, 'original');
      const link = path.join(mockDirs.jsl, 'nofollow-link.jsonl');
      fs.symlinkSync(target, link);

      const handle = await openJslFileForWrite('file://' + link);
      await handle.writeFile('fresh');
      await handle.close();
      expect(fs.readFileSync(target, 'utf-8')).toEqual('fresh');
    });

    test('refuses a symlink pointing out of the managed directories, leaving its target intact', async () => {
      if (!canSymlink) return;
      const target = path.join(mockDirs.outside, 'nofollow-outside');
      fs.writeFileSync(target, 'original');
      const link = path.join(mockDirs.jsl, 'nofollow-outside-link.jsonl');
      fs.symlinkSync(target, link);

      await expect(openJslFileForWrite('file://' + link)).rejects.toThrow(/Invalid jslid/);
      // the open does not truncate until the handle has been vouched for, so nothing was lost
      expect(fs.readFileSync(target, 'utf-8')).toEqual('original');
    });

    // the shape of the parent-symlink race: what the check approved as a real directory has
    // become a symlink out of the roots by the time the write happens
    test('refuses when a parent directory turned into a symlink after being approved', async () => {
      if (!canSymlink) return;
      const dir = path.join(mockDirs.jsl, 'racy');
      fs.mkdirSync(dir);
      const wanted = path.join(dir, 'x.jsonl');
      expect(getJslFileName('file://' + wanted)).toEqual(wanted);

      fs.rmSync(dir, { recursive: true });
      fs.symlinkSync(mockDirs.outside, dir);
      fs.writeFileSync(path.join(mockDirs.outside, 'x.jsonl'), 'precious');

      await expect(openJslFileForWrite('file://' + wanted)).rejects.toThrow(/Invalid jslid/);
      expect(fs.readFileSync(path.join(mockDirs.outside, 'x.jsonl'), 'utf-8')).toEqual('precious');
    });

    test('refuses a jslid outside the managed data directories', async () => {
      await expect(openJslFileForWrite('file:///etc/cron.d/dbgate')).rejects.toThrow(/Invalid jslid/);
    });
  });

  // streamRows used to canonicalize the path and read from the canonical one; confining every
  // jslid form in getJslFileName replaced that with a read of the client-shaped path, which
  // reads whatever the approved name resolves to by the time the stream opens it.
  describe('openJslFileForRead', () => {
    async function readAll(handle) {
      const stream = fs.createReadStream(null, { fd: handle.fd, encoding: 'utf-8', autoClose: false });
      let data = '';
      for await (const chunk of stream) data += chunk;
      await handle.close();
      return data;
    }

    test('reads a file inside a managed directory', async () => {
      const file = path.join(mockDirs.jsl, 'readable.jsonl');
      fs.writeFileSync(file, '{"a":1}\n');
      expect(await readAll(await openJslFileForRead('readable'))).toEqual('{"a":1}\n');
    });

    test('reads through an archive subfolder', async () => {
      fs.writeFileSync(path.join(mockDirs.archive, 'default', 'orders.jsonl'), 'row\n');
      expect(await readAll(await openJslFileForRead('archive://default/orders'))).toEqual('row\n');
    });

    test('refuses a jslid outside the managed data directories', async () => {
      await expect(openJslFileForRead('file:///etc/passwd')).rejects.toThrow(/Invalid jslid/);
    });

    test('refuses a symlink pointing out of the managed directories', async () => {
      if (!canSymlink) return;
      const target = path.join(mockDirs.outside, 'secret');
      fs.writeFileSync(target, 'SECRET');
      const link = path.join(mockDirs.uploads, 'leak.jsonl');
      fs.symlinkSync(target, link);
      await expect(openJslFileForRead(`file://${link}`)).rejects.toThrow(/Invalid jslid/);
    });

    // a missing file has to stay distinguishable, so streamRows can still answer 404 rather
    // than reporting every absent dataset as a forbidden path
    test('reports a missing file as ENOENT rather than a path refusal', async () => {
      await expect(openJslFileForRead('no-such-jslid')).rejects.toMatchObject({ code: 'ENOENT' });
    });
  });

  describe('Electron', () => {
    test('allows any path, because the user picked the file from a dialog', () => {
      platformInfo.isElectron = true;
      const local = path.join(mockDirs.outside, 'my-export.jsonl');
      expect(getJslFileName(`file://${local}`)).toEqual(local);
    });
  });
});
