// Regression tests for archive folder links and the archive write routes.
//
// archive.createLink stored any absolute path in a "<name>.link" file, and resolveArchiveFolder
// returned that path as it was - files.load / files.save and the archive routes then read, wrote
// and deleted files there. In the web app this gave anyone who could use the archive the whole
// filesystem of the server. The write routes also had no permission check.

const os = require('os');
const path = require('path');
const fsNode = require('fs');

const mockPlatformInfo = { isElectron: false };

// the real directories module (and so the real resolveArchiveFolder), in a temporary workspace
const savedWorkspaceDir = process.env.WORKSPACE_DIR;
const workspaceDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-archive-test-'));
process.env.WORKSPACE_DIR = workspaceDir;
afterAll(() => {
  if (savedWorkspaceDir === undefined) delete process.env.WORKSPACE_DIR;
  else process.env.WORKSPACE_DIR = savedWorkspaceDir;
});

jest.mock('../utility/platformInfo', () => mockPlatformInfo);
jest.mock('../utility/socket', () => ({ emit: jest.fn(), emitChanged: jest.fn() }));
jest.mock('../utility/hasPermission', () => ({ testStandardPermission: jest.fn() }));
jest.mock('../shell', () => ({}));
jest.mock('./jsldata', () => ({}));
jest.mock('../utility/checkLicense', () => ({ isProApp: () => true }));

const { testStandardPermission } = require('../utility/hasPermission');
const { archivedir, uploadsdir, clearArchiveLinksCache, resolveArchiveFolder } = require('../utility/directories');
const archive = require('./archive');

const req = { user: { userId: 11, login: 'alice' } };
const archiveDir = archivedir();
const uploadsDir = uploadsdir();
const outsideDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-archive-outside-'));
fsNode.mkdirSync(archiveDir, { recursive: true });
fsNode.mkdirSync(uploadsDir, { recursive: true });
fsNode.writeFileSync(path.join(outsideDir, 'secret.txt'), 'secret');
fsNode.writeFileSync(path.join(outsideDir, 'data.jsonl'), '{}');

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformInfo.isElectron = false;
  clearArchiveLinksCache();
  testStandardPermission.mockResolvedValue(undefined);
});

describe('archive folder links in the web app', () => {
  test('a link cannot be created', async () => {
    await expect(archive.createLink({ linkedFolder: outsideDir }, req)).rejects.toThrow('desktop app');
    expect(fsNode.readdirSync(archiveDir).filter(x => x.endsWith('.link'))).toEqual([]);
  });

  test('a link planted in the archive is not followed and not listed', async () => {
    fsNode.writeFileSync(path.join(archiveDir, 'planted.link'), outsideDir);

    // files() reports errors as an empty list
    expect(await archive.files({ folder: 'planted.link' })).toEqual([]);
    await expect(archive.saveText({ folder: 'planted.link', file: 'pwn', text: 'x' }, req)).rejects.toThrow(
      'desktop app'
    );
    await expect(archive.deleteFile({ folder: 'planted.link', file: 'secret', fileType: 'txt' }, req)).rejects.toThrow(
      'desktop app'
    );
    expect(fsNode.existsSync(path.join(outsideDir, 'secret.txt'))).toBe(true);
    expect(fsNode.existsSync(path.join(outsideDir, 'pwn.jsonl'))).toBe(false);

    const folders = await archive.folders();
    expect(folders.map(x => x.name)).not.toContain('planted.link');

    fsNode.unlinkSync(path.join(archiveDir, 'planted.link'));
  });

  test('the desktop app still creates and follows links', async () => {
    mockPlatformInfo.isElectron = true;
    const folder = await archive.createLink({ linkedFolder: outsideDir }, req);
    expect(folder.endsWith('.link')).toBe(true);
    const files = await archive.files({ folder });
    expect(files.map(x => x.name)).toContain('data');
    fsNode.unlinkSync(path.join(archiveDir, folder));
  });
});

describe('archive write routes', () => {
  test.each([
    ['createFolder', { folder: 'f1' }],
    ['saveText', { folder: 'default', file: 'x', text: '' }],
    ['deleteFile', { folder: 'default', file: 'x', fileType: 'jsonl' }],
    ['renameFolder', { folder: 'a', newFolder: 'b' }],
    ['deleteFolder', { folder: 'a' }],
    ['saveRows', { folder: 'default', file: 'x', rows: [] }],
  ])('%s requires archive/write', async (method, params) => {
    testStandardPermission.mockRejectedValue(new Error('DBGM-00265 Permission archive/write not granted'));
    await expect(archive[method](params, req)).rejects.toThrow('not granted');
    expect(testStandardPermission).toHaveBeenCalledWith('archive/write', req);
  });
});

describe('archive.saveUploadedZip', () => {
  test('refuses to copy a file that is not an upload', async () => {
    await expect(
      archive.saveUploadedZip({ filePath: path.join(outsideDir, 'secret.txt'), fileName: 'x.zip' }, req)
    ).rejects.toThrow('uploaded file');
    expect(fsNode.existsSync(path.join(archiveDir, 'x.zip'))).toBe(false);
  });

  test('copies an uploaded file', async () => {
    const uploadName = 'c56a4180-65aa-42ec-a945-5fd21dec0538';
    fsNode.writeFileSync(path.join(uploadsDir, uploadName), 'PK');
    await archive.saveUploadedZip({ filePath: path.join(uploadsDir, uploadName), fileName: 'data.zip' }, req);
    expect(fsNode.existsSync(path.join(archiveDir, 'data.zip'))).toBe(true);
  });
});

describe('resolveArchiveFolder', () => {
  test.each(['../outside', '..', 'a/b', 'a\\b','', 'a\0b'])('refuses %j in the web app', folder => {
    expect(() => resolveArchiveFolder(folder)).toThrow('Invalid archive folder name');
  });

  test('resolves a plain folder name inside the archive', () => {
    expect(resolveArchiveFolder('default')).toBe(path.join(archiveDir, 'default'));
  });

  test('keeps accepting any folder in the desktop app', () => {
    mockPlatformInfo.isElectron = true;
    expect(resolveArchiveFolder('../outside')).toBe(path.join(archiveDir, '../outside'));
  });
});
