// Regression tests for the connection definition routes (dbgate/dbgate#1601).
//
// connections/test, connections/save, connections/save-volatile and
// connections/batch-change-folder did not check any permission. A login restricted with
// LOGIN_PERMISSIONS_<login> to some connections could still make the server connect to any host
// and port (connections/test), store new connections or overwrite any existing one by its _id
// (connections/save), and move every connection to another folder.

const { EventEmitter } = require('events');

jest.mock('../utility/directories', () => ({
  datadir: jest.fn(() => '/nonexistent-datadir'),
  filesdir: jest.fn(() => '/nonexistent-filesdir'),
}));
jest.mock('../utility/socket', () => ({ emitChanged: jest.fn(), emit: jest.fn() }));
jest.mock('../utility/crypting', () => ({
  encryptConnection: jest.fn(x => x),
  maskConnection: jest.fn(x => x),
  pickSafeConnectionInfo: jest.fn(x => x),
}));
jest.mock('../utility/pipeForkLogs', () => jest.fn());
jest.mock('../utility/authProxy', () => ({ startTokenChecking: jest.fn() }));
jest.mock('./storage', () => ({ getConnection: jest.fn(async () => null) }));
jest.mock('./config', () => ({ getSettings: jest.fn(async () => ({})) }));
jest.mock('child_process', () => ({ fork: jest.fn() }));
jest.mock('fs-extra', () => ({ exists: jest.fn(async () => true), mkdir: jest.fn() }));
// permissions of the request come from req.permissions (like LOGIN_PERMISSIONS_<login>)
const mockDatabaseLoginProvider = {
  toJson: () => ({ workflowType: 'database' }),
  getLoginPageConnections: async () => [
    { conid: 'stored', passwordMode: undefined },
    { conid: 'asks', passwordMode: 'askPassword' },
  ],
  login: jest.fn(async () => ({ accessToken: 'token' })),
};
const mockAnonymousProvider = {
  toJson: () => ({ workflowType: 'anonymous' }),
  login: jest.fn(async () => ({ accessToken: 'token' })),
};
jest.mock('../auth/authProvider', () => ({
  getAuthProviderFromReq: jest.fn(() => ({
    getCurrentPermissions: async req => req.permissions,
    checkCurrentConnectionPermission: async () => true,
  })),
  getAuthProviderById: jest.fn(amoid =>
    amoid == 'dblogin' ? mockDatabaseLoginProvider : amoid == 'anonymous' ? mockAnonymousProvider : null
  ),
}));

const { fork } = require('child_process');
const connections = require('./connections');

const storedConnections = [
  { _id: 'allowed', engine: 'postgres@dbgate-plugin-postgres', server: 'db1', parent: 'team' },
  { _id: 'secret', engine: 'postgres@dbgate-plugin-postgres', server: 'db2', parent: 'team' },
];

let rows;
const fakeDatastore = {
  find: jest.fn(async () => rows),
  get: jest.fn(async id => rows.find(x => x._id == id)),
  insert: jest.fn(async x => ({ ...x, _id: 'new-id' })),
  update: jest.fn(async x => x),
  updateAll: jest.fn(async fn => {
    rows = rows.map(fn);
    return rows;
  }),
};

function connectedSubprocess() {
  const subprocess = new EventEmitter();
  subprocess.send = jest.fn(() => setImmediate(() => subprocess.emit('message', { msgtype: 'connected' })));
  return subprocess;
}

// a login allowed to use only the connection "allowed"
const restricted = { permissions: '~*,connections/allowed' };
const admin = { permissions: '*' };
const probe = { engine: 'mysql@dbgate-plugin-mysql', server: '10.0.0.5', port: '6379' };

const originalStorageDatabase = process.env.STORAGE_DATABASE;

beforeEach(() => {
  delete process.env.STORAGE_DATABASE;
  rows = storedConnections.map(x => ({ ...x }));
  connections.datastore = fakeDatastore;
  jest.clearAllMocks();
  fork.mockImplementation(() => connectedSubprocess());
});

afterAll(() => {
  if (originalStorageDatabase == null) delete process.env.STORAGE_DATABASE;
  else process.env.STORAGE_DATABASE = originalStorageDatabase;
});

describe('connections/test', () => {
  test('a restricted login cannot make the server connect to an arbitrary host', async () => {
    await expect(connections.test({ connection: probe }, restricted)).rejects.toThrow(/not granted/);
    await expect(connections.test({ connection: { ...probe, _id: 'made-up' } }, restricted)).rejects.toThrow(
      /not granted/
    );
    expect(fork).not.toHaveBeenCalled();
  });

  test('a restricted login cannot test a connection it has no permission for', async () => {
    await expect(connections.test({ connection: storedConnections[1] }, restricted)).rejects.toThrow(/not granted/);
    expect(fork).not.toHaveBeenCalled();
  });

  test('a restricted login can test a connection it may use', async () => {
    await expect(connections.test({ connection: storedConnections[0] }, restricted)).resolves.toEqual({
      msgtype: 'connected',
    });
  });

  test('a restricted login cannot change the target of a connection it may use', async () => {
    await connections.test({ connection: { ...storedConnections[0], ...probe } }, restricted);
    expect(fork.mock.results[0].value.send).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'allowed', engine: 'postgres@dbgate-plugin-postgres', server: 'db1' })
    );
  });

  test('an admin, an unrestricted login and the desktop app can test a new connection', async () => {
    await expect(connections.test({ connection: probe }, admin)).resolves.toEqual({ msgtype: 'connected' });
    await expect(connections.test({ connection: probe }, { permissions: undefined })).resolves.toEqual({
      msgtype: 'connected',
    });
    await expect(connections.test({ connection: probe })).resolves.toEqual({ msgtype: 'connected' });
  });
});

describe('connections/save', () => {
  test('a restricted login cannot create a connection', async () => {
    await expect(connections.save(probe, restricted)).rejects.toThrow(/not granted/);
    expect(fakeDatastore.insert).not.toHaveBeenCalled();
  });

  test('a restricted login cannot overwrite a connection it has no permission for', async () => {
    await expect(connections.save({ ...storedConnections[1], server: 'attacker' }, restricted)).rejects.toThrow(
      /not granted/
    );
    expect(fakeDatastore.update).not.toHaveBeenCalled();
  });

  test('a restricted login can save a connection it may use; an admin can create one', async () => {
    await connections.save({ ...storedConnections[0], displayName: 'renamed' }, restricted);
    expect(fakeDatastore.update).toHaveBeenCalled();
    await connections.save(probe, admin);
    expect(fakeDatastore.insert).toHaveBeenCalled();
  });

  test('a restricted login can rename a connection it may use, but not change its target', async () => {
    await connections.save({ ...storedConnections[0], ...probe, displayName: 'renamed' }, restricted);
    expect(fakeDatastore.update).toHaveBeenCalledWith({ ...storedConnections[0], displayName: 'renamed' });
  });

  test('a restricted login can save only connections in the local connection list', async () => {
    fakeDatastore.get.mockResolvedValueOnce(undefined);
    await expect(connections.save({ ...storedConnections[0] }, restricted)).rejects.toThrow(/not granted/);
    expect(fakeDatastore.update).not.toHaveBeenCalled();
  });

  test('a restricted login cannot create file database connections', async () => {
    await expect(connections.newSqliteDatabase({ file: 'x' }, restricted)).rejects.toThrow(/not granted/);
    await expect(connections.newDuckdbDatabase({ file: 'x' }, restricted)).rejects.toThrow(/not granted/);
    expect(fakeDatastore.insert).not.toHaveBeenCalled();
  });
});

describe('connections/update', () => {
  beforeEach(() => {
    fakeDatastore.patch = jest.fn(async (id, values) => ({ _id: id, ...values }));
  });

  test('a restricted login can change the folder and color of a connection it may use', async () => {
    await connections.update({ _id: 'allowed', values: { parent: 'mine', unsaved: false } }, restricted);
    await connections.update({ _id: 'allowed', values: { connectionColor: 'red' } }, restricted);
    expect(fakeDatastore.patch).toHaveBeenCalledTimes(2);
  });

  test('a restricted login cannot change the target or other settings', async () => {
    for (const values of [{ server: 'attacker' }, { parent: 'mine', isReadOnly: false }]) {
      await expect(connections.update({ _id: 'allowed', values }, restricted)).rejects.toThrow(/not granted/);
    }
    expect(fakeDatastore.patch).not.toHaveBeenCalled();
  });

  test('an admin can change anything', async () => {
    await connections.update({ _id: 'allowed', values: { server: 'db3' } }, admin);
    expect(fakeDatastore.patch).toHaveBeenCalledWith('allowed', { server: 'db3' });
  });
});

describe('connections/save-volatile', () => {
  test('needs permission for the connection it is based on', async () => {
    await expect(connections.saveVolatile({ conid: 'secret', password: 'x' }, restricted)).rejects.toThrow(
      /not granted/
    );
    const res = await connections.saveVolatile({ conid: 'allowed', password: 'x' }, restricted);
    expect(res).toEqual(expect.objectContaining({ server: 'db1', password: 'x', unsaved: true }));
  });
});

describe('connections/batch-change-folder', () => {
  test('moves only the connections the caller may see', async () => {
    await connections.batchChangeFolder({ folder: 'team', newFolder: 'mine' }, restricted);
    expect(rows.find(x => x._id == 'allowed').parent).toBe('mine');
    expect(rows.find(x => x._id == 'secret').parent).toBe('team');
  });

  test('moves all of them for an unrestricted caller', async () => {
    await connections.batchChangeFolder({ folder: 'team', newFolder: 'mine' }, admin);
    expect(rows.map(x => x.parent)).toEqual(['mine', 'mine']);
  });
});

// connections/dblogin-auth without user and password issued a session token for any conid and
// any auth method, also for connections that ask the user for credentials
describe('connections/dblogin-auth', () => {
  test('logs in with a connection that has stored credentials', async () => {
    expect(await connections.dbloginAuth({ amoid: 'dblogin', conid: 'stored' }, {})).toEqual({ accessToken: 'token' });
  });

  test('refuses a connection that asks for credentials, one not offered, or another auth method', async () => {
    expect(await connections.dbloginAuth({ amoid: 'dblogin', conid: 'asks' }, {})).toEqual({ error: 'Login failed' });
    expect(await connections.dbloginAuth({ amoid: 'dblogin', conid: 'other' }, {})).toEqual({ error: 'Login failed' });
    expect(await connections.dbloginAuth({ amoid: 'anonymous', conid: 'stored' }, {})).toEqual({
      error: 'Login failed',
    });
    expect(await connections.dbloginAuth({ amoid: 'unknown', conid: 'stored' }, {})).toEqual({ error: 'Login failed' });
    expect(mockDatabaseLoginProvider.login).not.toHaveBeenCalled();
    expect(mockAnonymousProvider.login).not.toHaveBeenCalled();
  });
});

// server-connections/ping and rest-connections/ping opened every connection in the list
describe('filterPermittedConnections', () => {
  test('keeps only the connections the caller may use, and volatile connections', async () => {
    const volatile = await connections.saveVolatile({ conid: 'allowed', password: 'x' }, restricted);
    expect(await connections.filterPermittedConnections(['allowed', 'secret', volatile._id, null], restricted)).toEqual(
      ['allowed', volatile._id]
    );
  });
});
