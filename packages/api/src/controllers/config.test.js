// Regression tests for config.updateSettings.
//
// The externalTools.* settings name the executables that native backup and restore start on the
// server (pg_dump, mysqldump, ...). They were writable with the plain settings/change permission,
// so any user allowed to change their editor settings could choose what the server runs.

const os = require('os');
const path = require('path');
const fsNode = require('fs');

const mockDataDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-config-test-'));

jest.mock('../utility/directories', () => ({ datadir: () => mockDataDir, getLogsFilePath: jest.fn() }));
jest.mock('../utility/hasPermission', () => ({ hasPermission: jest.fn(), loadPermissionsFromRequest: jest.fn() }));
jest.mock('../utility/socket', () => ({ emit: jest.fn(), emitChanged: jest.fn() }));
jest.mock('../controllers/connections', () => ({}));
jest.mock('../auth/authProvider', () => ({ getAuthProviderFromReq: jest.fn() }));
jest.mock('../utility/checkLicense', () => ({ checkLicense: jest.fn(), checkLicenseKey: jest.fn() }));
jest.mock('./storage', () => ({ readConfig: jest.fn(), writeConfig: jest.fn() }));
jest.mock('../shell', () => ({}));
jest.mock('../utility/authProxy', () => ({ getAuthProxyUrl: jest.fn(), tryToGetRefreshedLicense: jest.fn() }));
jest.mock('../utility/hardwareFingerprint', () => ({ getPublicHardwareFingerprint: jest.fn() }));
jest.mock('../utility/usageAnalyticsPolicy', () => ({ getUsageAnalyticsEnvironmentPolicy: jest.fn() }));
jest.mock('../utility/crypting', () => ({}));

const { hasPermission } = require('../utility/hasPermission');
const config = require('./config');

const req = { user: { userId: 11, login: 'alice' } };

function readSavedSettings() {
  try {
    return JSON.parse(fsNode.readFileSync(path.join(mockDataDir, 'settings.json'), 'utf-8'));
  } catch (err) {
    return {};
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  fsNode.rmSync(path.join(mockDataDir, 'settings.json'), { force: true });
});

describe('config.updateSettings', () => {
  test('a user with settings/change but not admin/settings cannot set an external tool', async () => {
    hasPermission.mockImplementation(permission => permission == 'settings/change');

    const res = await config.updateSettings({ 'externalTools.pg_dump': '/bin/sh' }, req);

    expect(res).toBe(false);
    expect(hasPermission).toHaveBeenCalledWith('admin/settings', undefined);
    expect(readSavedSettings()['externalTools.pg_dump']).toBeUndefined();
  });

  test('the same user can still change ordinary settings', async () => {
    hasPermission.mockImplementation(permission => permission == 'settings/change');

    const res = await config.updateSettings({ 'sqlEditor.preserveLogs': true }, req);

    expect(res).toBeTruthy();
    expect(readSavedSettings()['sqlEditor.preserveLogs']).toBe(true);
  });

  test('an admin can set an external tool', async () => {
    hasPermission.mockReturnValue(true);

    const res = await config.updateSettings({ 'externalTools.pg_dump': '/usr/bin/pg_dump' }, req);

    expect(res).toBeTruthy();
    expect(readSavedSettings()['externalTools.pg_dump']).toBe('/usr/bin/pg_dump');
  });
});
