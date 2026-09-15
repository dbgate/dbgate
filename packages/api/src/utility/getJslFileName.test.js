const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Real temp directories are used (instead of mocking fs) because the fix resolves
// realpath()s against uploadsdir() to catch symlink escapes, so the filesystem has to
// actually exist for the checks to mean anything.
const mockBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-jsl-test-'));
const mockUploadsDir = path.join(mockBaseDir, 'uploads');
const mockJsldir = path.join(mockBaseDir, 'jsldir');
const mockArchivedir = path.join(mockBaseDir, 'archivedir');
fs.mkdirSync(mockUploadsDir);
fs.mkdirSync(mockJsldir);
fs.mkdirSync(mockArchivedir);

const extraTempDirs = [];
function makeExtraTempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  extraTempDirs.push(dir);
  return dir;
}

jest.mock('./directories', () => ({
  jsldir: () => mockJsldir,
  archivedir: () => mockArchivedir,
  uploadsdir: () => mockUploadsDir,
  resolveArchiveFolder: folder => `${mockArchivedir}/${folder}`,
}));

jest.mock('./platformInfo', () => ({
  isElectron: false,
}));

const platformInfo = require('./platformInfo');
const getJslFileName = require('./getJslFileName');

describe('getJslFileName', () => {
  afterEach(() => {
    platformInfo.isElectron = false;
  });

  afterAll(() => {
    fs.rmSync(mockBaseDir, { recursive: true, force: true });
    for (const dir of extraTempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('rejects file:// jslid outside Electron', () => {
    expect(() => getJslFileName('file:///etc/passwd')).toThrow();
  });

  test('resolves file:// jslid to the raw path inside Electron', () => {
    platformInfo.isElectron = true;
    expect(getJslFileName('file:///etc/passwd')).toBe('/etc/passwd');
  });

  test('resolves a plain jslid inside jsldir', () => {
    expect(getJslFileName('abc123')).toBe(path.join(mockJsldir, 'abc123.jsonl'));
  });

  test('resolves an archive:// jslid inside the archive folder', () => {
    expect(getJslFileName('archive://myfolder/myfile')).toBe(`${mockArchivedir}/myfolder/myfile.jsonl`);
  });

  test('resolves a file:// jslid pointing at a real uploaded file outside Electron', () => {
    // this is the legitimate path taken by packages/web/src/utility/uploadFiles.ts
    // for an uploaded .jsonl/.ndjson file: a server-generated uuid inside uploadsdir()
    const uploadName = crypto.randomUUID();
    const filePath = path.join(mockUploadsDir, uploadName);
    fs.writeFileSync(filePath, '{}\n');
    expect(getJslFileName(`file://${filePath}`)).toBe(filePath);
  });

  test('rejects a file:// jslid with an upload-shaped name outside uploadsdir', () => {
    const otherDir = makeExtraTempDir('dbgate-jsl-other-');
    const uploadName = crypto.randomUUID();
    const filePath = path.join(otherDir, uploadName);
    fs.writeFileSync(filePath, '{}\n');
    expect(() => getJslFileName(`file://${filePath}`)).toThrow();
  });

  test('rejects a file:// jslid inside uploadsdir whose name is not upload-shaped', () => {
    const filePath = path.join(mockUploadsDir, 'not-a-uuid.jsonl');
    fs.writeFileSync(filePath, '{}\n');
    expect(() => getJslFileName(`file://${filePath}`)).toThrow();
  });

  test('rejects a symlinked file inside uploadsdir that escapes to an outside path', () => {
    const secretDir = makeExtraTempDir('dbgate-jsl-secret-');
    const secretFile = path.join(secretDir, 'secret.txt');
    fs.writeFileSync(secretFile, 'top secret');

    const uploadName = crypto.randomUUID();
    const symlinkPath = path.join(mockUploadsDir, uploadName);
    fs.symlinkSync(secretFile, symlinkPath);

    expect(() => getJslFileName(`file://${symlinkPath}`)).toThrow();
  });

  test('rejects a jslid whose upload-shaped name is reached via a symlinked uploadsdir subdirectory', () => {
    const outsideDir = makeExtraTempDir('dbgate-jsl-outside-');
    const uploadName = crypto.randomUUID();
    const realFile = path.join(outsideDir, uploadName);
    fs.writeFileSync(realFile, '{}\n');

    // a symlinked directory placed inside uploadsdir() must not be treated as uploadsdir() itself
    const symlinkedSubdir = path.join(mockUploadsDir, 'linked');
    fs.symlinkSync(outsideDir, symlinkedSubdir);

    expect(() => getJslFileName(`file://${path.join(symlinkedSubdir, uploadName)}`)).toThrow();
  });
});
