// Regression tests for the administration endpoints of the storage controller.
//
// Every one of these routes is reachable over HTTP by any authenticated user
// (useController registers each `*_meta` export as a POST route, and authMiddleware only
// proves authentication). They used to run with no authorization check at all, which let a
// low-privilege account read and rewrite users, roles, connections and auth configuration.

jest.mock('./storageDb', () => ({
  getStorageConnection: jest.fn(async () => [null, null]),
  getDbConnectionParams: jest.fn(),
  storageSelectFmt: jest.fn(async () => []),
  storageReadUserRolePermissions: jest.fn(async () => []),
  storageReadRolePermissions: jest.fn(async () => []),
  readComplexRolePermissions: jest.fn(async () => []),
  resolvePermissionConnectionIds: jest.fn(async () => []),
  storageCheckMcpConnectionAccess: jest.fn(),
  storageReadConfig: jest.fn(async () => ({})),
  storageWriteConfig: jest.fn(),
  getStorageConnectionError: jest.fn(),
  storageSaveRelationDiff: jest.fn(),
  storageSaveManualUserRoleDiff: jest.fn(),
  runStorageTransaction: jest.fn(),
  selectStorageIdentity: jest.fn(),
  storageSaveDetailPermissionsDiff: jest.fn(),
  saveStorageTeamFilesPermissions: jest.fn(),
  saveStorageTeamFoldersPermissions: jest.fn(),
  storageSqlCommandFmt: jest.fn(),
}));
jest.mock('../utility/hasPermission', () => ({
  hasPermission: jest.fn(() => true),
  loadPermissionsFromRequest: jest.fn(async () => []),
  testStandardPermission: jest.fn(),
}));
jest.mock('../utility/socket', () => ({ emit: jest.fn(), emitChanged: jest.fn() }));
jest.mock('../utility/auditlog', () => ({ sendToAuditLog: jest.fn() }));
jest.mock('../utility/authProxy', () => ({ obtainRefreshedLicense: jest.fn(), sendEmailViaApi: jest.fn() }));
jest.mock('../utility/crypting', () => ({
  loadEncryptionKeyFromExternal: jest.fn(),
  encryptUser: jest.fn(x => x),
  encryptConnection: jest.fn(x => x),
  encryptPasswordString: jest.fn(x => x),
  decryptPasswordString: jest.fn(x => x),
}));
jest.mock('../shell/dataReplicator', () => jest.fn());
jest.mock('dbgate-tools', () => ({
  ...jest.requireActual('dbgate-tools'),
  runQueryFmt: jest.fn(),
  runQueryOnDriver: jest.fn(async () => ({ rows: [] })),
  runCommandOnDriver: jest.fn(),
}));
jest.mock('../auth/authProvider', () => ({ setAuthProviders: jest.fn(), getAuthProviderById: jest.fn() }));
jest.mock('../auth/storageAuthProvider', () => ({
  createStorageAuthProvider: jest.fn(),
  SuperadminAuthProvider: class {},
  getMcpAuthProvider: jest.fn(),
}));

const { hasPermission, testStandardPermission } = require('../utility/hasPermission');
const { storageReadConfig, storageWriteConfig, getStorageConnection } = require('./storageDb');
const { runQueryFmt } = require('dbgate-tools');
const storage = require('./storage');

// route name -> the administration permission it must demand
const ADMIN_ROUTES = {
  readConfig: 'admin/settings',
  writeConfig: 'admin/settings',
  readAuthConfig: 'admin/auth',
  writeAuthConfig: 'admin/auth',
  readPermissions: 'admin/roles',
  writePermissions: 'admin/roles',
  readUserRolePermissions: 'admin/users',
  saveAdminData: 'admin/config',
  getUserList: 'admin/users',
  getUserDetail: 'admin/users',
  saveUserDetail: 'admin/users',
  deleteUser: 'admin/users',
  getConnectionList: 'admin/connections',
  getConnectionDetail: 'admin/connections',
  saveConnectionDetail: 'admin/connections',
  deleteConnection: 'admin/connections',
  copyConnection: 'admin/connections',
  getRoleList: 'admin/roles',
  getRoleDetail: 'admin/roles',
  deleteRole: 'admin/roles',
  saveRoleDetail: 'admin/roles',
  getAuditLog: 'admin/auditlog',
  getAuditLogDetail: 'admin/auditlog',
};

// Routes that are deliberately reachable without an administration permission.
// Anything not listed here and not in ADMIN_ROUTES is a new, ungated endpoint.
const NON_ADMIN_ROUTES = [
  'connections', // normal user connection list, filtered by per-connection permissions
  'getConnectionsForLoginPage', // rendered on the login page, before authentication
  'setAdminPassword', // guarded separately (first-run bootstrap / superadmin)
  'sendAuditLog', // the client recording its own audit events
  'requestPasswordReset', // unauthenticated by design
  'resetPassword', // unauthenticated by design, guarded by the emailed token
];

const fakeRequest = { user: { login: 'low-privilege', userId: 7 } };

describe('storage controller administration endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks only clears recorded calls, not implementations, so put the stateful
    // mocks back to their defaults explicitly
    testStandardPermission.mockResolvedValue(undefined);
    hasPermission.mockReturnValue(true);
    getStorageConnection.mockResolvedValue([null, null]);
    storageReadConfig.mockResolvedValue({});
  });

  test('every exposed route is either permission-gated or explicitly exempted', () => {
    const exposed = Object.keys(storage)
      .filter(key => key.endsWith('_meta'))
      .map(key => key.slice(0, -'_meta'.length));

    const ungated = exposed.filter(name => !(name in ADMIN_ROUTES) && !NON_ADMIN_ROUTES.includes(name));
    expect(ungated).toEqual([]);
  });

  describe.each(Object.entries(ADMIN_ROUTES))('%s', (route, permission) => {
    test(`demands ${permission} when called over HTTP`, async () => {
      await storage[route]({}, fakeRequest).catch(() => {
        // the handler may still fail afterwards (no storage connection in this test);
        // all we assert is that the permission was demanded first
      });
      expect(testStandardPermission).toHaveBeenCalledWith(permission, fakeRequest);
    });

    test('refuses the call when the permission is not granted', async () => {
      const denied = new Error(`DBGM-00265 Permission ${permission} not granted`);
      testStandardPermission.mockRejectedValue(denied);
      await expect(storage[route]({}, fakeRequest)).rejects.toThrow('not granted');
    });

    test('skips the check for internal in-process calls (no request)', async () => {
      await storage[route]({}).catch(() => {});
      expect(testStandardPermission).not.toHaveBeenCalled();
    });
  });

  // storageWriteConfig replaces a whole config group, so a write to 'admin' rewrites or clears
  // the administrator credential and the storage encryption key. That reopens the takeover
  // isAdminPasswordChangeAllowed closes: clear adminPasswordState, then set a fresh password
  // without knowing the old one, then log in as superadmin.
  describe('writeConfig cannot rewrite the admin group over HTTP', () => {
    beforeEach(() => {
      getStorageConnection.mockResolvedValue([{}, {}]);
    });

    test('refuses a write to the admin group from an HTTP caller', async () => {
      await expect(storage.writeConfig({ group: 'admin', config: { adminPasswordState: 'no' } }, fakeRequest))
        .rejects.toThrow(/set-admin-password/);
      expect(storageWriteConfig).not.toHaveBeenCalled();
    });

    test('refuses even an empty config, which would delete the group wholesale', async () => {
      await expect(storage.writeConfig({ group: 'admin', config: {} }, fakeRequest)).rejects.toThrow(
        /set-admin-password/
      );
      expect(storageWriteConfig).not.toHaveBeenCalled();
    });

    test('refuses a caller holding admin/settings, which is the permission this route demands', async () => {
      hasPermission.mockImplementation(tested => tested == 'admin/settings');
      await expect(
        storage.writeConfig({ group: 'admin', config: { adminPassword: 'crypt:mine' } }, fakeRequest)
      ).rejects.toThrow(/set-admin-password/);
      expect(storageWriteConfig).not.toHaveBeenCalled();
    });

    test('still allows the groups the product actually writes', async () => {
      await storage.writeConfig({ group: 'license', config: { licenseKey: 'abc' } }, fakeRequest);
      expect(storageWriteConfig).toHaveBeenCalledWith('license', { licenseKey: 'abc' });
    });

    // config.js and mcpAdmin.js write in process and pass no request
    test('leaves internal in-process writes alone', async () => {
      await storage.writeConfig({ group: 'admin', config: { adminPasswordState: 'set' } });
      expect(storageWriteConfig).toHaveBeenCalledWith('admin', { adminPasswordState: 'set' });
    });
  });

  // `/storage/set-admin-password` is in SKIP_AUTH_PATHS so that a brand new installation can
  // bootstrap its administrator account. It used to accept `denyUseAdminPassword` before any
  // check at all, which cleared adminPasswordState and reopened the bootstrap window - two
  // unauthenticated calls were enough to take over the superadmin account.
  describe('setAdminPassword authorization', () => {
    const anonymousRequest = {};
    const superadminRequest = { user: { amoid: 'superadmin', login: 'superadmin', roleId: -3 } };
    const lowPrivilegeRequest = { user: { login: 'bob', userId: 7 } };

    beforeEach(() => {
      delete process.env.ADMIN_PASSWORD;
      hasPermission.mockReturnValue(false);
    });

    test('allows the first-run bootstrap while no answer has been recorded', async () => {
      const allowed = await storage.isAdminPasswordChangeAllowed({ adminConfig: {} }, anonymousRequest);
      expect(allowed).toEqual(true);
    });

    test('refuses an anonymous caller once a password is set', async () => {
      const adminConfig = { adminPasswordState: 'set', adminPassword: 'crypt:current' };
      const allowed = await storage.isAdminPasswordChangeAllowed({ adminConfig }, anonymousRequest);
      expect(allowed).toEqual(false);
    });

    test('refuses an anonymous caller once the operator chose not to use a password', async () => {
      // this is the state the old denyUseAdminPassword branch left behind
      const adminConfig = { adminPasswordState: 'no' };
      const allowed = await storage.isAdminPasswordChangeAllowed({ adminConfig }, anonymousRequest);
      expect(allowed).toEqual(false);
    });

    test('refuses an anonymous caller when the password comes from ADMIN_PASSWORD', async () => {
      process.env.ADMIN_PASSWORD = 'from-env';
      const allowed = await storage.isAdminPasswordChangeAllowed({ adminConfig: {} }, anonymousRequest);
      expect(allowed).toEqual(false);
    });

    test('refuses a low-privilege authenticated caller with a wrong current password', async () => {
      const adminConfig = { adminPasswordState: 'set', adminPassword: 'crypt:current' };
      const allowed = await storage.isAdminPasswordChangeAllowed(
        { adminConfig, oldPassword: 'guess' },
        lowPrivilegeRequest
      );
      expect(allowed).toEqual(false);
    });

    test('accepts the correct current password', async () => {
      // decryptPasswordString is mocked as identity, so the stored value is the current password
      const adminConfig = { adminPasswordState: 'set', adminPassword: 'current-secret' };
      const allowed = await storage.isAdminPasswordChangeAllowed(
        { adminConfig, oldPassword: 'current-secret' },
        lowPrivilegeRequest
      );
      expect(allowed).toEqual(true);
    });

    test('accepts a superadmin session', async () => {
      const adminConfig = { adminPasswordState: 'set', adminPassword: 'crypt:current' };
      const allowed = await storage.isAdminPasswordChangeAllowed({ adminConfig }, superadminRequest);
      expect(allowed).toEqual(true);
    });

    test('accepts a user holding admin/settings, so a disabled password can be re-enabled', async () => {
      hasPermission.mockImplementation(tested => tested == 'admin/settings');
      const allowed = await storage.isAdminPasswordChangeAllowed(
        { adminConfig: { adminPasswordState: 'no' } },
        lowPrivilegeRequest
      );
      expect(allowed).toEqual(true);
    });

    // admin/settings stands in for the current password only where there is none to supply.
    // Letting it through in the 'set' state would hand anyone holding that permission the
    // administrator account, without ever knowing the password they replaced.
    test('refuses a user holding admin/settings once a password is set', async () => {
      hasPermission.mockImplementation(tested => tested == 'admin/settings');
      const adminConfig = { adminPasswordState: 'set', adminPassword: 'current-secret' };
      const allowed = await storage.isAdminPasswordChangeAllowed({ adminConfig }, lowPrivilegeRequest);
      expect(allowed).toEqual(false);
    });

    test('accepts a user holding admin/settings who supplies the current password', async () => {
      hasPermission.mockImplementation(tested => tested == 'admin/settings');
      const adminConfig = { adminPasswordState: 'set', adminPassword: 'current-secret' };
      const allowed = await storage.isAdminPasswordChangeAllowed(
        { adminConfig, oldPassword: 'current-secret' },
        lowPrivilegeRequest
      );
      expect(allowed).toEqual(true);
    });

    test('refuses a user holding admin/settings when the password comes from ADMIN_PASSWORD', async () => {
      // the state row may still say 'no', but the environment password is the live credential
      process.env.ADMIN_PASSWORD = 'from-env';
      hasPermission.mockImplementation(tested => tested == 'admin/settings');
      const allowed = await storage.isAdminPasswordChangeAllowed(
        { adminConfig: { adminPasswordState: 'no' } },
        lowPrivilegeRequest
      );
      expect(allowed).toEqual(false);
    });

    test('admin/settings alone cannot clear a configured password', async () => {
      hasPermission.mockImplementation(tested => tested == 'admin/settings');
      getStorageConnection.mockResolvedValue([{}, {}]);
      storageReadConfig.mockResolvedValue({ adminPasswordState: 'set', adminPassword: 'current-secret' });

      const res = await storage.setAdminPassword({ denyUseAdminPassword: true }, lowPrivilegeRequest);

      expect(res.status).toEqual('error');
      expect(runQueryFmt).not.toHaveBeenCalled();
    });

    test('denyUseAdminPassword no longer clears the configuration for an anonymous caller', async () => {
      getStorageConnection.mockResolvedValue([{}, {}]);
      storageReadConfig.mockResolvedValue({ adminPasswordState: 'set', adminPassword: 'crypt:current' });

      const res = await storage.setAdminPassword({ denyUseAdminPassword: true }, anonymousRequest);

      expect(res.status).toEqual('error');
      expect(runQueryFmt).not.toHaveBeenCalled();
    });
  });

  describe('readConfig secret redaction', () => {
    test('never returns the storage encryption key or admin password to an API caller', async () => {
      storageReadConfig.mockResolvedValue({
        encryptionKey: 'SECRET-KEY-BLOB',
        adminPassword: 'crypt:SECRET-ADMIN-PASSWORD',
        adminPasswordState: 'set',
      });

      const res = await storage.readConfig({ group: 'admin' }, fakeRequest);

      expect(res).not.toHaveProperty('encryptionKey');
      expect(res).not.toHaveProperty('adminPassword');
      expect(res.adminPasswordState).toEqual('set');
    });

    test('never returns MCP token or OAuth client secret material to an API caller', async () => {
      storageReadConfig.mockResolvedValue({
        enabled: true,
        authMode: 'token',
        tokenHash: 'HASH',
        tokenEncrypted: 'crypt:TOKEN',
        oauthClientSecretHash: 'HASH2',
        oauthClientSecretEncrypted: 'crypt:SECRET',
        tokenSuffix: 'abc123',
      });

      const res = await storage.readConfig({ group: 'mcp' }, fakeRequest);

      expect(res).not.toHaveProperty('tokenHash');
      expect(res).not.toHaveProperty('tokenEncrypted');
      expect(res).not.toHaveProperty('oauthClientSecretHash');
      expect(res).not.toHaveProperty('oauthClientSecretEncrypted');
      expect(res.tokenSuffix).toEqual('abc123');
    });

    test('internal callers still receive the secrets they need to operate', async () => {
      storageReadConfig.mockResolvedValue({ encryptionKey: 'SECRET-KEY-BLOB' });

      const res = await storage.readConfig({ group: 'admin' });

      expect(res.encryptionKey).toEqual('SECRET-KEY-BLOB');
    });
  });
});
