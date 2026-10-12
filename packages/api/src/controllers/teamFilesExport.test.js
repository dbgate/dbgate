// Regression test for teamFiles.exportFile, which wrote the team file's content to whatever path
// the client sent - in the web app, to any file on the server. Like files.exportFile it now
// writes only into the managed data directories (the web client downloads from the uploads one).

const os = require('os');
const path = require('path');
const fsNode = require('fs');

const mockPlatformInfo = { isElectron: false };

const savedWorkspaceDir = process.env.WORKSPACE_DIR;
const workspaceDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-teamfiles-test-'));
process.env.WORKSPACE_DIR = workspaceDir;
afterAll(() => {
  if (savedWorkspaceDir === undefined) delete process.env.WORKSPACE_DIR;
  else process.env.WORKSPACE_DIR = savedWorkspaceDir;
});

jest.mock('../utility/platformInfo', () => mockPlatformInfo);
jest.mock('./storageDb', () => ({
  storageGetExistingFileWithContent: jest.fn(async () => ({ id: 42, type_name: 'sql', file_content: 'select 1' })),
}));
jest.mock('../utility/hasPermission', () => ({
  loadPermissionsFromRequest: jest.fn(async () => []),
  hasPermission: jest.fn(() => true),
}));
jest.mock('../auth/storageAuthProvider', () => ({ getBuiltinRoleIdFromRequest: jest.fn(() => 1) }));
jest.mock('../utility/socket', () => ({ emitChanged: jest.fn() }));

const { uploadsdir } = require('../utility/directories');
const teamFiles = require('./teamFiles');

const req = { user: { userId: 11, login: 'alice' } };

beforeEach(() => {
  jest.spyOn(teamFiles, 'checkFileReadAccess').mockResolvedValue(true);
});

test('refuses to write outside the data directories', async () => {
  const outsideFile = path.join(fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-outside-')), 'pwn.sql');
  expect(await teamFiles.exportFile({ teamFileId: 42, filePath: outsideFile }, req)).toBe(false);
  expect(fsNode.existsSync(outsideFile)).toBe(false);
});

test('writes into the uploads folder, where the web client downloads it from', async () => {
  const target = path.join(uploadsdir(), 'export.sql');
  expect(await teamFiles.exportFile({ teamFileId: 42, filePath: target }, req)).toBe(true);
  expect(fsNode.readFileSync(target, 'utf-8')).toBe('select 1');
});
