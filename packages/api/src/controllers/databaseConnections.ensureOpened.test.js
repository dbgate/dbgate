// Regression tests for issue #1621 (MS SQL Server DB structure isn't showing - "Unknown error").
//
// ensureOpened awaited connections.getCore() / config.getSettings() before registering the new entry,
// so concurrent calls forked several databaseConnectionProcess subprocesses for one conid/database.
// The duplicate (never pinged) exited later and its exit handler closed the HEALTHY connection,
// storing a closed status { name: 'error' } without a message.

const { EventEmitter } = require('events');

// uuid 14 is ESM only; jest can require() it only on Node 24.9+, so keep this suite runnable on older Node
jest.mock('uuid', () => {
  const { randomUUID } = require('crypto');
  return { v1: () => randomUUID(), v4: () => randomUUID() };
});
jest.mock('../utility/directories', () => ({
  filesdir: () => '/nonexistent/files',
  uploadsdir: () => '/nonexistent/uploads',
  archivedir: () => '/nonexistent/archive',
  appdir: () => '/nonexistent/apps',
  rundir: () => '/nonexistent/run',
  resolveArchiveFolder: folder => `/nonexistent/archive/${folder}`,
}));
jest.mock('./connections', () => ({ getCore: jest.fn() }));
jest.mock('./runners', () => ({}));
jest.mock('./archive', () => ({}));
jest.mock('./config', () => ({ getSettings: jest.fn() }));
jest.mock('./sessions', () => ({}));
jest.mock('./jsldata', () => ({}));
jest.mock('../utility/socket', () => ({ emit: jest.fn(), emitChanged: jest.fn(), emitOwned: jest.fn() }));
jest.mock('../utility/auditlog', () => ({ sendToAuditLog: jest.fn() }));
jest.mock('../utility/processComm', () => ({ handleProcessCommunication: jest.fn(() => false) }));
jest.mock('../utility/pipeForkLogs', () => jest.fn());
jest.mock('../utility/sshTunnel', () => ({ getSshTunnel: jest.fn() }));
jest.mock('../utility/authProxy', () => ({}));
jest.mock('../utility/connectUtility', () => ({ extractConnectionSslParams: jest.fn() }));
jest.mock('../utility/crypting', () => ({ decryptConnection: jest.fn(x => x) }));
jest.mock('../utility/requireEngineDriver', () => jest.fn(() => ({})));
jest.mock('../utility/exportDbModel', () => jest.fn());
jest.mock('../utility/importDbModel', () => jest.fn());
jest.mock('../utility/loadModelTransform', () => jest.fn());
jest.mock('../utility/exportDbModelSql', () => jest.fn());
jest.mock('../shell/generateDeploySql', () => jest.fn());
jest.mock('../utility/hasPermission', () => ({
  testConnectionPermission: jest.fn(),
  testStandardPermission: jest.fn(),
  testDatabaseRolePermission: jest.fn(),
  hasPermission: jest.fn(() => true),
  loadPermissionsFromRequest: jest.fn(async () => []),
  loadTablePermissionsFromRequest: jest.fn(),
  getTablePermissionRole: jest.fn(),
  loadDatabasePermissionsFromRequest: jest.fn(),
  getDatabasePermissionRole: jest.fn(),
  getTablePermissionRoleLevelIndex: jest.fn(),
}));
jest.mock('child_process', () => ({ fork: jest.fn() }));
jest.mock('diff2html', () => ({ html: jest.fn(), parse: jest.fn() }));
jest.mock('diff', () => ({ createTwoFilesPatch: jest.fn() }));
jest.mock('../utility/diff2htmlPage', () => jest.fn());

const { fork } = require('child_process');
const connections = require('./connections');
const config = require('./config');
const databaseConnections = require('./databaseConnections');

const CONID = 'conid1';
const DB = 'db1';
const tick = () => new Promise(resolve => setImmediate(resolve));

let forked;

function createFakeSubprocess() {
  const subprocess = new EventEmitter();
  subprocess.send = jest.fn();
  // a real kill would emit 'exit' later; the fake does not, so tests control exits explicitly
  subprocess.kill = jest.fn();
  subprocess.stdout = new EventEmitter();
  subprocess.stderr = new EventEmitter();
  return subprocess;
}

const openedFor = (conid, database) =>
  databaseConnections.opened.filter(x => x.conid == conid && x.database == database);

beforeEach(() => {
  jest.clearAllMocks();
  databaseConnections.opened = [];
  databaseConnections.closed = {};
  databaseConnections.requests = {};
  forked = [];
  fork.mockImplementation(() => {
    const subprocess = createFakeSubprocess();
    forked.push(subprocess);
    return subprocess;
  });
  connections.getCore.mockImplementation(async ({ conid }) => {
    await tick();
    return { _id: conid, engine: 'mssql@dbgate-plugin-mssql' };
  });
  config.getSettings.mockImplementation(async () => {
    await tick();
    return {};
  });
});

describe('ensureOpened - concurrent calls (AC 1, 2)', () => {
  test('two concurrent calls for the same database fork exactly one subprocess and share one entry', async () => {
    const [a, b] = await Promise.all([
      databaseConnections.ensureOpened(CONID, DB),
      databaseConnections.ensureOpened(CONID, DB),
    ]);

    expect(fork).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(openedFor(CONID, DB)).toHaveLength(1);
    expect(openedFor(CONID, DB)[0]).toBe(a);
  });

  test('five concurrent calls for the same database fork exactly one subprocess', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => databaseConnections.ensureOpened(CONID, DB)));

    expect(fork).toHaveBeenCalledTimes(1);
    for (const r of results) expect(r).toBe(results[0]);
    expect(openedFor(CONID, DB)).toHaveLength(1);
  });

  test('concurrent calls for two different databases on the same connection fork two subprocesses', async () => {
    const [a, b] = await Promise.all([
      databaseConnections.ensureOpened(CONID, 'db1'),
      databaseConnections.ensureOpened(CONID, 'db2'),
    ]);

    expect(fork).toHaveBeenCalledTimes(2);
    expect(a).not.toBe(b);
    expect(a.database).toBe('db1');
    expect(b.database).toBe('db2');
    expect(openedFor(CONID, 'db1')).toHaveLength(1);
    expect(openedFor(CONID, 'db2')).toHaveLength(1);
  });
});

describe('subprocess exit/error only affects its own entry (AC 3)', () => {
  test.each(['exit', 'error'])(
    'race: %s of the duplicate subprocess does not close the healthy connection',
    async eventName => {
      const [a, b] = await Promise.all([
        databaseConnections.ensureOpened(CONID, DB),
        databaseConnections.ensureOpened(CONID, DB),
      ]);
      const current = openedFor(CONID, DB)[0];
      expect(current).toBeDefined();
      current.status = { name: 'ok' };
      const pendingReject = jest.fn();
      databaseConnections.requests['msg1'] = [jest.fn(), pendingReject, {}, CONID, DB];

      // every subprocess that is not the current one is a stale duplicate (none, once fixed)
      const stale = forked.filter(s => s !== current.subprocess);
      for (const s of stale) s.emit(eventName, eventName == 'error' ? new Error('stale failed') : undefined);

      expect(openedFor(CONID, DB)).toHaveLength(1);
      expect(openedFor(CONID, DB)[0]).toBe(current);
      expect(current.disconnected).toBeFalsy();
      expect(current.subprocess.kill).not.toHaveBeenCalled();
      expect(current.status).toEqual({ name: 'ok' });
      expect(databaseConnections.closed[`${CONID}/${DB}`]).toBeUndefined();
      expect(pendingReject).not.toHaveBeenCalled();
      expect(databaseConnections.requests['msg1']).toBeDefined();
      // and both callers got the same entry
      expect(a).toBe(b);
    }
  );

  test.each(['exit', 'error'])(
    'stale entry (closed, then reopened): %s of the old subprocess leaves the new connection alone',
    async eventName => {
      const first = await databaseConnections.ensureOpened(CONID, DB);
      databaseConnections.close(CONID, DB); // kill=true, the fake kill does not emit exit
      expect(first.subprocess.kill).toHaveBeenCalledTimes(1);
      const closedAfterFirst = databaseConnections.closed[`${CONID}/${DB}`];

      const second = await databaseConnections.ensureOpened(CONID, DB);
      expect(second).not.toBe(first);
      second.status = { name: 'ok' };

      first.subprocess.emit(eventName, eventName == 'error' ? new Error('old failed') : undefined);

      expect(openedFor(CONID, DB)).toHaveLength(1);
      expect(openedFor(CONID, DB)[0]).toBe(second);
      expect(second.disconnected).toBeFalsy();
      expect(second.subprocess.kill).not.toHaveBeenCalled();
      expect(second.status).toEqual({ name: 'ok' });
      expect(databaseConnections.closed[`${CONID}/${DB}`]).toBe(closedAfterFirst);
    }
  );

  test.each(['exit', 'error'])(
    'stale entry not marked disconnected: %s of its subprocess leaves the current connection alone',
    async eventName => {
      // simulate the duplicate left over by the race: an entry that is not current and not disconnected
      const first = await databaseConnections.ensureOpened(CONID, DB);
      databaseConnections.opened = databaseConnections.opened.filter(x => x !== first);
      const second = await databaseConnections.ensureOpened(CONID, DB);
      expect(second).not.toBe(first);
      second.status = { name: 'ok' };

      first.subprocess.emit(eventName, eventName == 'error' ? new Error('old failed') : undefined);

      expect(openedFor(CONID, DB)).toHaveLength(1);
      expect(openedFor(CONID, DB)[0]).toBe(second);
      expect(second.disconnected).toBeFalsy();
      expect(second.subprocess.kill).not.toHaveBeenCalled();
      expect(second.status).toEqual({ name: 'ok' });
      expect(databaseConnections.closed[`${CONID}/${DB}`]).toBeUndefined();
      expect(first.disconnected).toBe(true);
    }
  );
});

describe('exit of the current subprocess (AC 4)', () => {
  test.each(['exit', 'error'])('%s removes the entry and stores an error status', async eventName => {
    const opened = await databaseConnections.ensureOpened(CONID, DB);
    opened.status = { name: 'ok' };
    const pendingReject = jest.fn();
    databaseConnections.requests['msg1'] = [jest.fn(), pendingReject, {}, CONID, DB];

    opened.subprocess.emit(eventName, eventName == 'error' ? new Error('failed') : undefined);

    expect(openedFor(CONID, DB)).toHaveLength(0);
    expect(opened.disconnected).toBe(true);
    expect(opened.subprocess.kill).not.toHaveBeenCalled();
    expect(databaseConnections.closed[`${CONID}/${DB}`].status.name).toBe('error');
    expect(pendingReject).toHaveBeenCalled();
    expect(databaseConnections.requests['msg1']).toBeUndefined();
  });
});

describe('failing ensureOpened does not leave the lock stuck (AC 5)', () => {
  test('concurrent callers all reject when the connection is missing, a later call succeeds', async () => {
    connections.getCore.mockImplementation(async () => {
      await tick();
      return null;
    });

    const results = await Promise.allSettled([
      databaseConnections.ensureOpened(CONID, DB),
      databaseConnections.ensureOpened(CONID, DB),
      databaseConnections.ensureOpened(CONID, DB),
    ]);
    for (const r of results) {
      expect(r.status).toBe('rejected');
      expect(String(r.reason.message)).toMatch(/not found/);
    }
    expect(fork).not.toHaveBeenCalled();
    expect(openedFor(CONID, DB)).toHaveLength(0);

    connections.getCore.mockImplementation(async ({ conid }) => {
      await tick();
      return { _id: conid, engine: 'mssql@dbgate-plugin-mssql' };
    });

    const opened = await databaseConnections.ensureOpened(CONID, DB);
    expect(fork).toHaveBeenCalledTimes(1);
    expect(openedFor(CONID, DB)).toHaveLength(1);
    expect(openedFor(CONID, DB)[0]).toBe(opened);
  });
});
