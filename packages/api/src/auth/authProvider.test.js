// Regression tests for token issuance by auth providers.
//
// The provider whose login() runs is chosen by the client through its amoid (auth/login,
// connections/dblogin-auth, ...). AuthProviderBase.login used to sign a session token without
// checking anything, and every provider that did not override it inherited that - so
// `POST /auth/login {"amoid":"superadmin"}` returned a superadmin token, and OAuth / Google /
// MS Entra logins could be skipped by asking for a token directly.

jest.mock('dbgate-tools', () => ({
  getLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
  extractErrorLogData: jest.fn(),
  getPredefinedPermissions: jest.fn(() => []),
  sortPermissionsFromTheSameLevel: jest.fn(x => x),
  getConnectionLabel: jest.fn(),
  runQueryFmt: jest.fn(),
}));
jest.mock('activedirectory2', () => ({ promiseWrapper: class {} }));
jest.mock('axios', () => ({ default: { post: jest.fn(), get: jest.fn() } }));
jest.mock('google-auth-library', () => ({ GoogleAuth: class {}, OAuth2Client: class {}, JWT: class {} }));
jest.mock('../controllers/storageDb', () => ({
  storageSelectFmt: jest.fn(async () => []),
  storageReadUserRolePermissions: jest.fn(async () => []),
  storageReadUserPermissions: jest.fn(async () => []),
  storageReadRolePermissions: jest.fn(async () => []),
  storageSqlCommandFmt: jest.fn(),
  loadSuperadminPermissions: jest.fn(async () => []),
  readComplexUserRolePermissions: jest.fn(async () => []),
  readComplexRolePermissions: jest.fn(async () => []),
  resolvePermissionConnectionIds: jest.fn(async () => []),
  storageCheckRoleConnectionAccess: jest.fn(async () => true),
  storageCheckUserRoleConnectionAccess: jest.fn(async () => true),
  storageSyncUserAuthRoles: jest.fn(),
}));
jest.mock('../utility/authProxy', () => ({ authProxyGetTokenFromCode: jest.fn(), authProxyGetRedirectUrl: jest.fn() }));
jest.mock('../utility/crypting', () => ({ decryptUser: jest.fn(x => x), decryptPasswordString: jest.fn(x => x) }));
jest.mock('../utility/auditlog', () => ({ sendToAuditLog: jest.fn() }));
jest.mock('../utility/loginchecker', () => ({
  isLoginLicensed: jest.fn(async () => true),
  LOGIN_LIMIT_ERROR: 'login limit',
  markTokenAsLoggedIn: jest.fn(),
  markUserAsActive: jest.fn(),
  markLoginAsLoggedOut: jest.fn(),
}));
jest.mock('./authConfigTools', () => ({ isEnabledConfigValue: jest.fn(() => true) }));
jest.mock('../controllers/storage', () => ({ readConfig: jest.fn(async () => ({})) }));
jest.mock('../utility/cloudIntf', () => ({
  createDbGateIdentitySession: jest.fn(),
  startCloudTokenChecking: jest.fn(),
  readCloudTokenHolder: jest.fn(),
  readCloudTestTokenHolder: jest.fn(),
}));
jest.mock('../utility/socket', () => ({
  ...jest.requireActual('../utility/socket'),
  emit: jest.fn(),
  emitChanged: jest.fn(),
}));
jest.mock('../utility/mcpAuth', () => ({
  readMcpConfig: jest.fn(),
  getPublicBaseUrl: jest.fn(),
  getMcpResourceUrl: jest.fn(),
  setMcpIdentity: jest.fn(),
  safeTokenHashEquals: jest.fn(),
}));

const jwt = require('jsonwebtoken');

const AUTH_ENV_KEYS = ['AUTH_PROVIDER', 'STORAGE_DATABASE', 'OAUTH_AUTH', 'AD_URL', 'LOGIN', 'PASSWORD', 'BASIC_AUTH'];

// Providers read the auth env variables both when the module is loaded and when login() runs,
// so the variables stay set until the test finishes.
let savedEnv = null;

function loadAuthProviderModule(env = {}) {
  savedEnv = {};
  for (const key of AUTH_ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  Object.assign(process.env, env);
  let mod;
  jest.isolateModules(() => {
    mod = require('./authProvider');
  });
  return mod;
}

afterEach(() => {
  if (!savedEnv) return;
  for (const key of AUTH_ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  savedEnv = null;
});

describe('env auth providers', () => {
  test('AuthProviderBase.login does not issue a token', async () => {
    const { AuthProviderBase } = loadAuthProviderModule();
    const resp = await new AuthProviderBase().login('user', 'password');
    expect(resp.accessToken).toBeUndefined();
    expect(resp.error).toBeTruthy();
  });

  test('without configured authentication, the anonymous provider still logs everybody in', async () => {
    const { getDefaultAuthProvider } = loadAuthProviderModule();
    const provider = getDefaultAuthProvider();
    expect(provider.amoid).toBe('none');
    expect(provider.toJson().workflowType).toBe('anonymous');

    const resp = await provider.login(undefined, undefined);
    expect(resp.accessToken).toBeTruthy();
    expect(jwt.decode(resp.accessToken).amoid).toBe('none');
  });

  test('AUTH_PROVIDER=none logs everybody in anonymously', async () => {
    const { getDefaultAuthProvider } = loadAuthProviderModule({ AUTH_PROVIDER: 'none' });
    const provider = getDefaultAuthProvider();
    expect(provider.amoid).toBe('none');
    expect((await provider.login(undefined, undefined)).accessToken).toBeTruthy();
  });

  test('an unknown AUTH_PROVIDER denies all logins instead of falling back to anonymous', async () => {
    const { getDefaultAuthProvider } = loadAuthProviderModule({ AUTH_PROVIDER: 'oatuh' });
    const provider = getDefaultAuthProvider();
    expect(provider.amoid).toBe('deny');

    const resp = await provider.login('admin', 'secret');
    expect(resp.accessToken).toBeUndefined();
    expect(resp.error).toBeTruthy();
  });

  test('the env OAuth provider cannot be logged into without the OAuth flow', async () => {
    const { getDefaultAuthProvider } = loadAuthProviderModule({ OAUTH_AUTH: 'https://idp.example/authorize' });
    const provider = getDefaultAuthProvider();
    expect(provider.amoid).toBe('oauth');

    const resp = await provider.login(undefined, undefined);
    expect(resp.accessToken).toBeUndefined();
  });

  test('the env logins provider still rejects wrong credentials and accepts correct ones', async () => {
    const { getDefaultAuthProvider } = loadAuthProviderModule({ LOGIN: 'admin', PASSWORD: 'secret' });
    const provider = getDefaultAuthProvider();
    expect(provider.amoid).toBe('logins');

    expect((await provider.login('admin', 'wrong')).accessToken).toBeUndefined();
    expect((await provider.login('admin', undefined)).accessToken).toBeUndefined();
    expect((await provider.login('admin', 'secret')).accessToken).toBeTruthy();
  });
});

describe('storage auth providers', () => {
  const { createStorageAuthProvider, SuperadminAuthProvider } = require('./storageAuthProvider');

  test('the superadmin provider does not issue a token from login()', async () => {
    const resp = await new SuperadminAuthProvider().login(undefined, undefined, undefined, {});
    expect(resp.accessToken).toBeUndefined();
  });

  test.each(['oauth', 'google', 'msentra', 'unknown-type'])(
    'the %s storage provider does not issue a token from login()',
    async type => {
      const provider = createStorageAuthProvider({ amoid: `${type}-1`, type, name: type });
      const resp = await provider.login(undefined, undefined, undefined, {});
      expect(resp.accessToken).toBeUndefined();
    }
  );

  test('the anonymous storage provider still logs everybody in', async () => {
    const provider = createStorageAuthProvider({ amoid: 'anonymous-1', type: 'none', name: 'Anonymous' });
    const resp = await provider.login(undefined, undefined, undefined, {});
    expect(resp.accessToken).toBeTruthy();
  });
});

describe('auth/login', () => {
  const { setAuthProviders, AnonymousAuthProvider } = require('./authProvider');
  const { createStorageAuthProvider, SuperadminAuthProvider } = require('./storageAuthProvider');
  const authController = require('../controllers/auth');

  beforeEach(() => {
    const local = createStorageAuthProvider({ amoid: 'local-1', type: 'local', name: 'Local' });
    const oauth = createStorageAuthProvider({ amoid: 'oauth-1', type: 'oauth', name: 'OAuth' });
    setAuthProviders([local, oauth, new SuperadminAuthProvider()], local);
  });

  test('a superadmin token cannot be obtained by naming the superadmin provider', async () => {
    const resp = await authController.login({ amoid: 'superadmin' }, {});
    expect(resp.accessToken).toBeUndefined();
  });

  test('a redirect-based provider cannot be logged into directly', async () => {
    const resp = await authController.login({ amoid: 'oauth-1' }, {});
    expect(resp.accessToken).toBeUndefined();
  });

  test('an unknown provider is rejected instead of throwing', async () => {
    const resp = await authController.login({ amoid: 'no-such-provider' }, {});
    expect(resp.accessToken).toBeUndefined();
    expect(resp.error).toBeTruthy();
  });

  test('the anonymous provider keeps working when it is the configured one', async () => {
    setAuthProviders([new AnonymousAuthProvider()]);
    const resp = await authController.login({ amoid: 'none' }, {});
    expect(resp.accessToken).toBeTruthy();
  });
});

describe('authMiddleware with BASIC_AUTH', () => {
  const { authMiddleware } = require('../controllers/auth');

  let savedBasicAuth, savedStorageDatabase;
  beforeEach(() => {
    savedBasicAuth = process.env.BASIC_AUTH;
    savedStorageDatabase = process.env.STORAGE_DATABASE;
  });
  afterEach(() => {
    if (savedBasicAuth === undefined) delete process.env.BASIC_AUTH;
    else process.env.BASIC_AUTH = savedBasicAuth;
    if (savedStorageDatabase === undefined) delete process.env.STORAGE_DATABASE;
    else process.env.STORAGE_DATABASE = savedStorageDatabase;
  });

  async function callProtectedRoute() {
    const req = { path: '/connections/list', headers: {} };
    const res = { status: jest.fn(() => res), send: jest.fn(() => res), setHeader: jest.fn() };
    const next = jest.fn();
    await authMiddleware(req, res, next);
    return { res, next };
  }

  test('basic auth alone leaves the token check to the basic auth middleware', async () => {
    process.env.BASIC_AUTH = '1';
    delete process.env.STORAGE_DATABASE;
    const { next } = await callProtectedRoute();
    expect(next).toHaveBeenCalled();
  });

  // main.js does not install basic auth when storage is used, so skipping the token check here
  // used to leave the whole API unauthenticated.
  test('with BASIC_AUTH and STORAGE_DATABASE both set, requests still need a token', async () => {
    process.env.BASIC_AUTH = '1';
    process.env.STORAGE_DATABASE = 'dbgate';
    const { res, next } = await callProtectedRoute();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// The cloud login token used to be written to every connected event stream - and /stream is not
// authenticated
describe('auth/create-cloud-login-session', () => {
  const socket = require('../utility/socket');
  const { createDbGateIdentitySession, startCloudTokenChecking } = require('../utility/cloudIntf');
  const authController = require('../controllers/auth');
  const tokenHolder = { email: 'alice@example.com', token: 'cloud-token' };

  beforeEach(() => {
    jest.clearAllMocks();
    createDbGateIdentitySession.mockResolvedValue({ sid: 'sid1', url: 'https://identity.example/login' });
    startCloudTokenChecking.mockImplementation((sid, callback) => callback(tokenHolder));
  });

  test('the token goes only to the stream of the tab that started the login', async () => {
    await authController.createCloudLoginSession({ client: 'web' }, { headers: { 'x-dbgate-strmid': 'tab-a' } });
    expect(socket.emit).toHaveBeenCalledWith('got-cloud-token', { ...tokenHolder, strmid: 'tab-a' });
  });

  test('without the stream id of a tab, no stream receives it', async () => {
    await authController.createCloudLoginSession({ client: 'web' }, { headers: {} });
    const call = socket.emit.mock.calls.find(([message]) => message == 'got-cloud-token');
    expect(call[1].strmid).toBeTruthy();
    expect(call[1].strmid).not.toBe('tab-a');
  });

  test('the desktop app, which calls without a request, still receives it', async () => {
    await authController.createCloudLoginSession({ client: 'app' });
    expect(socket.emit).toHaveBeenCalledWith('got-cloud-token', tokenHolder);
  });
});
