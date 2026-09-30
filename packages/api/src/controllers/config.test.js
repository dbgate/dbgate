// Regression tests for config/get-settings. The route is on the unauthenticated skip list (the
// login page loads settings), and it used to return every setting to anyone, including AI
// provider API keys and the cloud sign-in token holder.

jest.mock('../controllers/connections', () => ({}));
jest.mock('./storage', () => ({}));
jest.mock('../shell', () => ({}));
jest.mock('../auth/authProvider', () => ({}));
jest.mock('../utility/checkLicense', () => ({}));
jest.mock('../utility/authProxy', () => ({}));
jest.mock('../utility/hardwareFingerprint', () => ({}));
jest.mock('../utility/usageAnalyticsPolicy', () => ({}));
jest.mock('../utility/socket', () => ({ emit: jest.fn(), emitChanged: jest.fn() }));

const config = require('./config');

const SETTINGS = {
  'storage.allowForgottenPasswordReset': true,
  'storage.usageAnalytics': 'disabled',
  currentThemeDefinition: { themeName: 'dark' },
  'ai.customProviders': [{ name: 'p', apiKey: 'SECRET-API-KEY' }],
  cloudSigninTokenHolder: { token: 'SECRET-CLOUD-TOKEN' },
  'connection.sshBindHost': '127.0.0.1',
};

describe('config.getSettings', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.SKIP_ALL_AUTH;
    delete process.env.BASIC_AUTH;
    jest.spyOn(config, 'loadSettings').mockResolvedValue(SETTINGS);
  });

  afterAll(() => {
    process.env = savedEnv;
  });

  test('an unauthenticated HTTP request gets only the public keys', async () => {
    const res = await config.getSettings({}, { headers: {} });
    expect(res).toEqual({
      'storage.allowForgottenPasswordReset': true,
      'storage.usageAnalytics': 'disabled',
      currentThemeDefinition: { themeName: 'dark' },
    });
    expect(JSON.stringify(res)).not.toContain('SECRET');
  });

  test('a request with an invalid token is treated as unauthenticated', async () => {
    const res = await config.getSettings({}, { headers: {}, isInvalidToken: true });
    expect(res).not.toHaveProperty('ai.customProviders');
    expect(res).not.toHaveProperty('cloudSigninTokenHolder');
  });

  test('a logged-in user gets all settings', async () => {
    const res = await config.getSettings({}, { headers: {}, user: { login: 'alice' } });
    expect(res).toEqual(SETTINGS);
  });

  test('internal callers (no request) get all settings', async () => {
    expect(await config.getSettings()).toEqual(SETTINGS);
  });

  test.each(['SKIP_ALL_AUTH', 'BASIC_AUTH'])('with %s all settings are returned', async envName => {
    process.env[envName] = '1';
    expect(await config.getSettings({}, { headers: {} })).toEqual(SETTINGS);
  });
});
