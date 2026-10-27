// Regression tests for config.updateSettings.
//
// The externalTools.* settings name the executables that native backup and restore start on the
// server (pg_dump, mysqldump, ...). They were writable with the plain settings/change permission,
// so any user allowed to change their editor settings could choose what the server runs.

const os = require('os');
const path = require('path');
const fsNode = require('fs');

const mockDataDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-config-test-'));

const mockArchiveDir = path.join(mockDataDir, 'archive');
fsNode.mkdirSync(mockArchiveDir);

jest.mock('../utility/directories', () => ({
  datadir: () => mockDataDir,
  archivedir: () => mockArchiveDir,
  filesdir: () => require('path').join(mockDataDir, 'files'),
  uploadsdir: () => require('path').join(mockDataDir, 'uploads'),
  appdir: () => require('path').join(mockDataDir, 'apps'),
  getLogsFilePath: jest.fn(),
}));
jest.mock('../utility/hasPermission', () => ({
  hasPermission: jest.fn(),
  loadPermissionsFromRequest: jest.fn(),
  testStandardPermission: jest.fn(),
}));
jest.mock('../utility/socket', () => ({ emit: jest.fn(), emitChanged: jest.fn() }));
jest.mock('../controllers/connections', () => ({}));
jest.mock('../auth/authProvider', () => ({ getAuthProviderFromReq: jest.fn() }));
jest.mock('../utility/checkLicense', () => ({ checkLicense: jest.fn(), checkLicenseKey: jest.fn() }));
jest.mock('./storage', () => ({ readConfig: jest.fn(), writeConfig: jest.fn() }));
jest.mock('../shell', () => ({ zipJsonLinesData: jest.fn() }));
jest.mock('../utility/authProxy', () => ({ getAuthProxyUrl: jest.fn(), tryToGetRefreshedLicense: jest.fn() }));
jest.mock('../utility/hardwareFingerprint', () => ({ getPublicHardwareFingerprint: jest.fn() }));
jest.mock('../utility/usageAnalyticsPolicy', () => ({ getUsageAnalyticsEnvironmentPolicy: jest.fn() }));
jest.mock('../utility/crypting', () => ({}));

const { hasPermission, testStandardPermission } = require('../utility/hasPermission');
const { zipJsonLinesData } = require('../shell');
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

// config/get-settings is reachable without login (the login page needs a setting), and returned
// every setting, including the shared DbGate Cloud sign-in token and AI provider API keys
describe('config.getSettings', () => {
  const secretSettings = {
    'storage.allowForgottenPasswordReset': true,
    cloudSigninTokenHolder: { token: 'secret-cloud-token' },
    'ai.customProviders': [{ apiKey: 'secret-ai-key' }],
  };

  beforeEach(() => {
    fsNode.writeFileSync(path.join(mockDataDir, 'settings.json'), JSON.stringify(secretSettings));
  });

  test('without login, only the settings for the login page are returned', async () => {
    expect(await config.getSettings({}, { headers: {} })).toEqual({ 'storage.allowForgottenPasswordReset': true });
  });

  test('a logged-in user and internal callers get all settings', async () => {
    expect(await config.getSettings({}, req)).toEqual(expect.objectContaining(secretSettings));
    expect(await config.getSettings()).toEqual(expect.objectContaining(secretSettings));
  });
});

// config/save-license-key needed no login at all, so anyone could replace or break the licence
describe('licence', () => {
  test('saving a licence key needs admin/license', async () => {
    testStandardPermission.mockRejectedValueOnce(new Error('DBGM-00265 Permission admin/license not granted'));
    await expect(config.saveLicenseKey({ licenseKey: 'x' }, req)).rejects.toThrow(/admin\/license/);
    expect(testStandardPermission).toHaveBeenCalledWith('admin/license', req);
  });

  test('starting a trial needs admin/license', async () => {
    testStandardPermission.mockRejectedValueOnce(new Error('DBGM-00265 Permission admin/license not granted'));
    await expect(config.startTrial({}, req)).rejects.toThrow(/admin\/license/);
  });

  test('the licence key cannot be changed through the settings without admin/license', async () => {
    hasPermission.mockImplementation(permission => permission == 'settings/change');
    expect(await config.updateSettings({ 'other.licenseKey': 'x' }, req)).toBe(false);
    expect(hasPermission).toHaveBeenCalledWith('admin/license', undefined);
  });
});

// "Save to archive" in Export connections & settings sends "archive:<name>.zip", which the export
// path check refused as a path outside the managed directories
describe('config.createConnectionsAndSettingsZip', () => {
  test('saves to the archive with an archive: path', async () => {
    hasPermission.mockReturnValue(true);

    expect(await config.createConnectionsAndSettingsZip({ db: {}, filePath: 'archive:dbgateconfig.zip' }, req)).toBe(
      true
    );
    expect(zipJsonLinesData).toHaveBeenCalledWith({}, path.join(mockArchiveDir, 'dbgateconfig.zip'));
  });

  test('refuses an archive: path leaving the managed directories', async () => {
    hasPermission.mockReturnValue(true);

    await expect(
      config.createConnectionsAndSettingsZip({ db: {}, filePath: 'archive:../../x.zip' }, req)
    ).rejects.toThrow(/Refused export write/);
    expect(zipJsonLinesData).not.toHaveBeenCalled();
  });
});
