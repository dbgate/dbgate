// Regression tests for the files routes that reached server files outside the data directories:
//
//   * files.load / files.save followed archive folder links ("archive:<name>.link") to any path.
//   * files.saveUploadedFile and files.getJsonsFromZip took the "uploaded" file as a full path
//     from the client, so they copied or read any file of the server; saveUploadedFile also put
//     the client's file name into the target path unchecked.

const os = require('os');
const path = require('path');
const fsNode = require('fs');

const mockPlatformInfo = { isElectron: false };

// the real directories module, in a temporary workspace
const savedWorkspaceDir = process.env.WORKSPACE_DIR;
const workspaceDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-files-test-'));
process.env.WORKSPACE_DIR = workspaceDir;
afterAll(() => {
  if (savedWorkspaceDir === undefined) delete process.env.WORKSPACE_DIR;
  else process.env.WORKSPACE_DIR = savedWorkspaceDir;
});

jest.mock('../utility/platformInfo', () => mockPlatformInfo);
jest.mock('../utility/hasPermission', () => ({
  hasPermission: jest.fn(() => true),
  loadPermissionsFromRequest: jest.fn(async () => null),
  loadFilePermissionsFromRequest: jest.fn(async () => null),
  getFilePermissionRole: jest.fn(),
  testStandardPermission: jest.fn(),
}));
jest.mock('../utility/socket', () => ({
  ...jest.requireActual('../utility/socket'),
  emit: jest.fn(),
  emitChanged: jest.fn(),
  subscribeTopic: jest.fn(),
}));
jest.mock('./scheduler', () => ({}));
jest.mock('./apps', () => ({}));
jest.mock('../shell', () => ({ unzipJsonLinesData: jest.fn(async () => ({ ok: true })) }));
jest.mock('../utility/appLogStore', () => ({
  getRecentAppLogRecords: jest.fn(() => [{ msg: 'a' }, { msg: 'b' }]),
  copyAppLogsIntoFile: jest.fn(),
}));
jest.mock('../utility/getChartExport', () => jest.fn());
jest.mock('../utility/getDiagramExport', () => jest.fn());

const { archivedir, uploadsdir, filesdir, clearArchiveLinksCache } = require('../utility/directories');
const dbgateApi = require('../shell');
const socket = require('../utility/socket');
const { testStandardPermission, hasPermission } = require('../utility/hasPermission');
const files = require('./files');

const req = { user: { userId: 11, login: 'alice' } };
const outsideDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-files-outside-'));
const secretFile = path.join(outsideDir, 'secret.sql');
fsNode.writeFileSync(secretFile, 'secret');
const UPLOAD = 'c56a4180-65aa-42ec-a945-5fd21dec0538';

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformInfo.isElectron = false;
  clearArchiveLinksCache();
});

describe('archive links through files.load / files.save', () => {
  beforeAll(() => {
    fsNode.writeFileSync(path.join(archivedir(), 'planted.link'), outsideDir);
  });

  test('a planted link is not followed for reading', async () => {
    await expect(
      files.load({ folder: 'archive:planted.link', file: 'secret.sql', format: 'text' }, req)
    ).rejects.toThrow('desktop app');
  });

  test('a planted link is not followed for writing', async () => {
    await expect(
      files.save({ folder: 'archive:planted.link', file: 'pwn.sql', data: 'x', format: 'text' }, req)
    ).rejects.toThrow('desktop app');
    expect(fsNode.existsSync(path.join(outsideDir, 'pwn.sql'))).toBe(false);
  });
});

describe('files.saveUploadedFile', () => {
  beforeAll(() => {
    fsNode.mkdirSync(path.join(filesdir(), 'sql'), { recursive: true });
  });

  test('refuses to copy a file that is not an upload', async () => {
    await expect(files.saveUploadedFile({ filePath: secretFile, fileName: 'stolen.sql' }, req)).rejects.toThrow(
      'uploaded file'
    );
    expect(fsNode.existsSync(path.join(filesdir(), 'sql', 'stolen.sql'))).toBe(false);
  });

  test('refuses a file name that leaves the target folder', async () => {
    fsNode.writeFileSync(path.join(uploadsdir(), UPLOAD), 'select 1');
    await expect(
      files.saveUploadedFile({ filePath: path.join(uploadsdir(), UPLOAD), fileName: '../../pwn.sql' }, req)
    ).rejects.toThrow('Invalid file name');
    expect(fsNode.existsSync(path.join(workspaceDir, 'pwn.sql'))).toBe(false);
  });

  test('saves an uploaded file', async () => {
    fsNode.writeFileSync(path.join(uploadsdir(), UPLOAD), 'select 1');
    await files.saveUploadedFile({ filePath: path.join(uploadsdir(), UPLOAD), fileName: 'query.sql' }, req);
    expect(fsNode.readFileSync(path.join(filesdir(), 'sql', 'query.sql'), 'utf-8')).toBe('select 1');
  });

  test('requires write permission to the target folder', async () => {
    hasPermission.mockImplementation(permission => permission != 'files/sql/write');
    try {
      fsNode.writeFileSync(path.join(filesdir(), 'sql', 'shared.sql'), 'original');
      fsNode.writeFileSync(path.join(uploadsdir(), UPLOAD), 'overwritten');
      await expect(
        files.saveUploadedFile({ filePath: path.join(uploadsdir(), UPLOAD), fileName: 'shared.sql' }, req)
      ).rejects.toThrow('files/sql/write');
      expect(fsNode.readFileSync(path.join(filesdir(), 'sql', 'shared.sql'), 'utf-8')).toBe('original');
    } finally {
      hasPermission.mockImplementation(() => true);
    }
  });

  test('does not write through a symlink planted at the destination', async () => {
    const outsideTarget = path.join(outsideDir, 'target.sql');
    fsNode.writeFileSync(outsideTarget, 'outside');
    const linkPath = path.join(filesdir(), 'sql', 'linked.sql');
    try {
      fsNode.symlinkSync(outsideTarget, linkPath);
    } catch (err) {
      // creating symlinks needs extra privileges on Windows
      return;
    }
    fsNode.writeFileSync(path.join(uploadsdir(), UPLOAD), 'pwned');
    await expect(
      files.saveUploadedFile({ filePath: path.join(uploadsdir(), UPLOAD), fileName: 'linked.sql' }, req)
    ).rejects.toThrow();
    expect(fsNode.readFileSync(outsideTarget, 'utf-8')).toBe('outside');
  });
});

describe('files.getJsonsFromZip', () => {
  test('refuses a file that is not an upload', async () => {
    await expect(files.getJsonsFromZip({ filePath: secretFile })).rejects.toThrow('uploaded file');
    expect(dbgateApi.unzipJsonLinesData).not.toHaveBeenCalled();
  });

  test('reads an uploaded file', async () => {
    fsNode.writeFileSync(path.join(uploadsdir(), UPLOAD), 'PK');
    await files.getJsonsFromZip({ filePath: path.join(uploadsdir(), UPLOAD) });
    expect(dbgateApi.unzipJsonLinesData).toHaveBeenCalledWith(path.join(uploadsdir(), UPLOAD));
  });
});

// The application log holds the SQL every user ran; its routes had no permission check, and new
// records were written to every connected event stream
describe('application log', () => {
  test('reading the recent log requires the application-log permission', async () => {
    testStandardPermission.mockRejectedValueOnce(new Error('DBGM-00265 Permission application-log not granted'));
    await expect(files.getRecentAppLog({ limit: 10 }, req)).rejects.toThrow('not granted');
    expect(socket.subscribeTopic).not.toHaveBeenCalled();
  });

  test('reading the recent log subscribes the caller stream to new records', async () => {
    const res = await files.getRecentAppLog({ limit: 1 }, { ...req, headers: { 'x-dbgate-strmid': 'tab-a' } });
    expect(testStandardPermission).toHaveBeenCalledWith('application-log', expect.anything());
    expect(socket.subscribeTopic).toHaveBeenCalledWith('tab-a', 'applog');
    expect(res).toEqual([{ msg: 'b' }]);
  });

  test('exporting the log requires the application-log permission', async () => {
    testStandardPermission.mockRejectedValueOnce(new Error('DBGM-00265 Permission application-log not granted'));
    await expect(files.fillAppLogs({}, req)).rejects.toThrow('not granted');
  });
});
