// Regression tests for apps/save-virtual-reference, apps/save-dictionary-description and
// apps/create-app-from-db. They checked no permission, and appid (the app file name) went into
// the file path unchecked, so '../..' rewrote any JSON file on the server.

const os = require('os');
const path = require('path');
const fsNode = require('fs');

const mockFilesDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-apps-test-'));
jest.mock('../utility/directories', () => ({ filesdir: () => mockFilesDir, appdir: () => mockFilesDir }));
jest.mock('../utility/socket', () => ({ emitChanged: jest.fn() }));
jest.mock('./connections', () => ({}));
jest.mock('../utility/hasPermission', () => ({
  loadPermissionsFromRequest: jest.fn(async () => null),
  loadFilePermissionsFromRequest: jest.fn(async () => []),
  hasPermission: jest.fn(() => false),
  getFilePermissionRole: jest.fn(() => null),
  testStandardPermission: jest.fn(),
}));

const { testStandardPermission, getFilePermissionRole } = require('../utility/hasPermission');
const apps = require('./apps');

const req = { user: { login: 'alice' } };
const appFile = path.join(mockFilesDir, 'apps', 'my-app');
const outsideFile = path.join(mockFilesDir, 'settings.json');
const reference = {
  schemaName: null,
  pureName: 't',
  refSchemaName: null,
  refTableName: 'r',
  columns: [{ columnName: 'a', refColumnName: 'b' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  fsNode.mkdirSync(path.join(mockFilesDir, 'apps'), { recursive: true });
  fsNode.writeFileSync(appFile, JSON.stringify({ applicationName: 'My app' }));
  fsNode.writeFileSync(outsideFile, JSON.stringify({ secret: true }));
});

test('saves a virtual reference into the app', async () => {
  expect(await apps.saveVirtualReference({ appid: 'my-app', ...reference }, req)).toBe(true);
  expect(JSON.parse(fsNode.readFileSync(appFile, 'utf-8')).virtualReferences).toHaveLength(1);
  expect(testStandardPermission).toHaveBeenCalledWith('files/apps/write', req);
});

test('an appid outside the apps folder is refused', async () => {
  await expect(apps.saveVirtualReference({ appid: '../settings.json', ...reference }, req)).rejects.toThrow(
    /Invalid application/
  );
  await expect(
    apps.saveDictionaryDescription({ appid: '../settings.json', pureName: 't', columns: [] }, req)
  ).rejects.toThrow(/Invalid application/);
  expect(JSON.parse(fsNode.readFileSync(outsideFile, 'utf-8'))).toEqual({ secret: true });
});

test('saving needs files/apps/write, and the app must not be denied to the user', async () => {
  testStandardPermission.mockRejectedValueOnce(new Error('DBGM-00265 Permission files/apps/write not granted'));
  await expect(apps.saveVirtualReference({ appid: 'my-app', ...reference }, req)).rejects.toThrow(/not granted/);
  testStandardPermission.mockRejectedValueOnce(new Error('DBGM-00265 Permission files/apps/write not granted'));
  await expect(apps.createAppFromDb({ appName: 'x', server: 's', database: 'd' }, req)).rejects.toThrow(/not granted/);

  getFilePermissionRole.mockReturnValueOnce('deny');
  await expect(apps.saveVirtualReference({ appid: 'my-app', ...reference }, req)).rejects.toThrow(/not granted/);
});
