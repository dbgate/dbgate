// Regression tests for the two authorization holes on the query-session routes:
//
//   * sessions.create opened a session - and therefore a subprocess holding the connection's
//     credentials - against any conid, with no permission check at all.
//   * sessions.executeQuery skipped both dbops/query and the run_script database role whenever
//     the caller supplied a `useToken`, and that token was signed with a constant published in
//     the source, so anyone could mint one for arbitrary SQL.

jest.mock('./connections', () => ({ getCore: jest.fn(async () => ({ _id: 'conid1', engine: 'x' })) }));
jest.mock('./jsldata', () => ({}));
jest.mock('./teamFiles', () => ({ execGrantStillStands: jest.fn(async () => ({ isTargetBound: true })) }));
jest.mock('./config', () => ({ getSettings: jest.fn(async () => ({})) }));
jest.mock('./databaseConnections', () => ({ ensureOpened: jest.fn(async () => ({ structure: null })) }));
// the real owner bookkeeping, with the writes to event streams mocked
jest.mock('../utility/socket', () => ({
  ...jest.requireActual('../utility/socket'),
  emit: jest.fn(),
  emitChanged: jest.fn(),
}));
jest.mock('../utility/auditlog', () => ({ sendToAuditLog: jest.fn() }));
jest.mock('../utility/pipeForkLogs', () => jest.fn());
jest.mock('../utility/processComm', () => ({ handleProcessCommunication: jest.fn(() => false) }));
jest.mock('../utility/hasPermission', () => ({
  testStandardPermission: jest.fn(),
  testDatabaseRolePermission: jest.fn(),
  testConnectionPermission: jest.fn(),
}));
jest.mock('child_process', () => ({ fork: jest.fn() }));
jest.mock('../utility/requireEngineDriver', () => jest.fn(() => ({})));

const { fork } = require('child_process');
const {
  testStandardPermission,
  testDatabaseRolePermission,
  testConnectionPermission,
} = require('../utility/hasPermission');
const { createTeamFileExecToken } = require('../utility/teamFileExecToken');
const { execGrantStillStands } = require('./teamFiles');
const requireEngineDriver = require('../utility/requireEngineDriver');
const sessions = require('./sessions');

const SQL = 'select * from invoices';
// the connection and database the team file pins, matching the session openFakeSession opens
const TARGET = { conid: 'conid1', database: 'db1' };
const alice = { user: { userId: 11, amoid: 'local', login: 'alice' } };
const bob = { user: { userId: 12, amoid: 'local', login: 'bob' } };

function openFakeSession(sesid = 'ses1') {
  const subprocess = { send: jest.fn(), on: jest.fn(), kill: jest.fn() };
  sessions.opened = [{ sesid, conid: 'conid1', database: 'db1', subprocess }];
  return subprocess;
}

describe('sessions.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessions.opened = [];
  });

  test('checks the connection permission before opening a session', async () => {
    testConnectionPermission.mockRejectedValue(new Error('DBGM-00264 Connection permission not granted'));

    await expect(sessions.create({ conid: 'someone-elses-conid', database: 'db1' }, bob)).rejects.toThrow(
      'permission not granted'
    );

    expect(testConnectionPermission).toHaveBeenCalledWith('someone-elses-conid', bob);
    expect(fork).not.toHaveBeenCalled();
  });
});

describe('sessions.executeQuery', () => {
  let subprocess;

  beforeEach(() => {
    jest.clearAllMocks();
    subprocess = openFakeSession();
    testStandardPermission.mockResolvedValue(undefined);
    testDatabaseRolePermission.mockResolvedValue(undefined);
    testConnectionPermission.mockResolvedValue(undefined);
    execGrantStillStands.mockResolvedValue({ isTargetBound: true });
  });

  test('checks dbops/query and the run_script role for an ordinary query', async () => {
    await sessions.executeQuery({ sesid: 'ses1', sql: SQL }, alice);

    expect(testStandardPermission).toHaveBeenCalledWith('dbops/query', alice);
    expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'run_script', alice);
  });

  test('refuses the query when the caller lacks the run_script role', async () => {
    testDatabaseRolePermission.mockRejectedValue(new Error('DBGM-00266 Permission run_script not granted'));

    await expect(sessions.executeQuery({ sesid: 'ses1', sql: SQL }, alice)).rejects.toThrow('not granted');
    expect(subprocess.send).not.toHaveBeenCalled();
  });

  test('a useToken forged with the published constant does not skip the permission checks', async () => {
    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    const evilSql = 'drop table invoices';
    const forged = jwt.sign(
      { contentHash: crypto.createHash('md5').update(evilSql).digest('hex') },
      '14813c43-a91b-4ad1-9dcd-a81bd7dbb05f'
    );
    testDatabaseRolePermission.mockRejectedValue(new Error('DBGM-00266 Permission run_script not granted'));

    await expect(
      sessions.executeQuery({ sesid: 'ses1', sql: evilSql, frontMatter: { useToken: forged } }, alice)
    ).rejects.toThrow('not granted');

    expect(testStandardPermission).toHaveBeenCalledWith('dbops/query', alice);
    expect(subprocess.send).not.toHaveBeenCalled();
  });

  test('a genuine useToken issued to this caller still runs the file without those checks', async () => {
    const useToken = createTeamFileExecToken(SQL, 42, alice, TARGET);

    await sessions.executeQuery({ sesid: 'ses1', sql: SQL, frontMatter: { useToken } }, alice);

    expect(testStandardPermission).not.toHaveBeenCalled();
    expect(testDatabaseRolePermission).not.toHaveBeenCalled();
    expect(subprocess.send).toHaveBeenCalledWith(expect.objectContaining({ msgtype: 'executeQuery', sql: SQL }));
  });

  test('a genuine useToken replayed by another user does not skip the checks', async () => {
    const useToken = createTeamFileExecToken(SQL, 42, alice, TARGET);
    testDatabaseRolePermission.mockRejectedValue(new Error('DBGM-00266 Permission run_script not granted'));

    await expect(
      sessions.executeQuery({ sesid: 'ses1', sql: SQL, frontMatter: { useToken } }, bob)
    ).rejects.toThrow('not granted');
  });

  test('a genuine useToken does not authorize a different statement', async () => {
    const useToken = createTeamFileExecToken(SQL, 42, alice, TARGET);
    testDatabaseRolePermission.mockRejectedValue(new Error('DBGM-00266 Permission run_script not granted'));

    await expect(
      sessions.executeQuery({ sesid: 'ses1', sql: 'drop table invoices', frontMatter: { useToken } }, alice)
    ).rejects.toThrow('not granted');
  });

  // The grant used to name no connection or database, so any verified token skipped the
  // run_script role for every session the caller could open. A user with connection access but
  // no role on another database could take the grant from an auto-execute file and spend it
  // there.
  test('a useToken from a file pinned elsewhere does not skip the checks on this session', async () => {
    const useToken = createTeamFileExecToken(SQL, 42, alice, { conid: 'conid1', database: 'development' });
    testDatabaseRolePermission.mockRejectedValue(new Error('DBGM-00266 Permission run_script not granted'));

    // the session openFakeSession opened is conid1/db1
    await expect(
      sessions.executeQuery({ sesid: 'ses1', sql: SQL, frontMatter: { useToken } }, alice)
    ).rejects.toThrow('not granted');

    expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'run_script', alice);
    expect(subprocess.send).not.toHaveBeenCalled();
  });

  test('a useToken from a file that pins no connection keeps the run_script role', async () => {
    const useToken = createTeamFileExecToken(SQL, 42, alice, null);
    execGrantStillStands.mockResolvedValue({ isTargetBound: false });
    testDatabaseRolePermission.mockRejectedValue(new Error('DBGM-00266 Permission run_script not granted'));

    await expect(
      sessions.executeQuery({ sesid: 'ses1', sql: SQL, frontMatter: { useToken } }, alice)
    ).rejects.toThrow('not granted');

    // the grant still carries the statement, so the global query permission is not demanded
    expect(testStandardPermission).not.toHaveBeenCalled();
    expect(subprocess.send).not.toHaveBeenCalled();
  });

  // teamFileId is a claim the token carries, so the file behind it is reloaded and the use
  // access derived again - a grant stops working the moment that access is withdrawn
  test('a useToken whose team file no longer grants use access does not skip the checks', async () => {
    const useToken = createTeamFileExecToken(SQL, 42, alice, TARGET);
    execGrantStillStands.mockResolvedValue(null);
    testDatabaseRolePermission.mockRejectedValue(new Error('DBGM-00266 Permission run_script not granted'));

    await expect(
      sessions.executeQuery({ sesid: 'ses1', sql: SQL, frontMatter: { useToken } }, alice)
    ).rejects.toThrow('not granted');

    expect(testStandardPermission).toHaveBeenCalledWith('dbops/query', alice);
  });

  test('the team file behind a grant is re-checked against the session it is spent on', async () => {
    const useToken = createTeamFileExecToken(SQL, 42, alice, TARGET);

    await sessions.executeQuery({ sesid: 'ses1', sql: SQL, frontMatter: { useToken } }, alice);

    expect(execGrantStillStands).toHaveBeenCalledWith(42, SQL, expect.objectContaining(TARGET), alice);
  });

  // The bypass used to be decided by the token, which carries isTargetBound for its whole
  // lifetime. Unpinning the file left the old grants skipping the role until they expired.
  test('unpinning the file withdraws the role bypass from a grant already issued', async () => {
    const useToken = createTeamFileExecToken(SQL, 42, alice, TARGET);
    // the token still says target bound; the file, reloaded, no longer does
    execGrantStillStands.mockResolvedValue({ isTargetBound: false });
    testDatabaseRolePermission.mockRejectedValue(new Error('DBGM-00266 Permission run_script not granted'));

    await expect(
      sessions.executeQuery({ sesid: 'ses1', sql: SQL, frontMatter: { useToken } }, alice)
    ).rejects.toThrow('not granted');

    expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'run_script', alice);
    expect(subprocess.send).not.toHaveBeenCalled();
  });

  test('a malformed useToken is rejected without crashing the route', async () => {
    await expect(
      sessions.executeQuery({ sesid: 'ses1', sql: SQL, frontMatter: { useToken: 'garbage' } }, alice)
    ).resolves.toEqual({ state: 'ok' });

    expect(testStandardPermission).toHaveBeenCalledWith('dbops/query', alice);
  });
});

// The grant is checked against the statement with its front matter removed, and the front matter
// block may contain lines that are not comments. Whatever is put inside a "-- >>> ... -- <<<"
// block in front of the file's content used to run under the grant as well.
describe('sessions.executeQuery with SQL hidden in the front matter', () => {
  let subprocess;

  beforeEach(() => {
    jest.clearAllMocks();
    subprocess = openFakeSession();
    testStandardPermission.mockResolvedValue(undefined);
    testDatabaseRolePermission.mockResolvedValue(undefined);
    testConnectionPermission.mockResolvedValue(undefined);
    execGrantStillStands.mockResolvedValue({ isTargetBound: true });
  });

  function sentSql() {
    return subprocess.send.mock.calls.find(([msg]) => msg.msgtype == 'executeQuery')[0].sql;
  }

  test('only the checked statement runs under a grant', async () => {
    const useToken = createTeamFileExecToken(SQL, 42, alice, TARGET);
    const smuggled = `-- >>>\ndelete from audit_log;\n-- <<<\n${SQL}`;

    await sessions.executeQuery({ sesid: 'ses1', sql: smuggled, frontMatter: { useToken } }, alice);

    expect(testDatabaseRolePermission).not.toHaveBeenCalled();
    expect(sentSql()).not.toContain('delete from audit_log');
    expect(sentSql().trim()).toBe(SQL);
  });

  test('a genuine file with front matter keeps its line numbers', async () => {
    const fileContent = `-- >>>\n-- autoExecute: true\n-- useToken: abc\n-- <<<\n${SQL}`;
    const useToken = createTeamFileExecToken(fileContent, 42, alice, TARGET);

    await sessions.executeQuery({ sesid: 'ses1', sql: fileContent, frontMatter: { useToken } }, alice);

    expect(sentSql()).toBe(`\n\n\n\n${SQL}`);
    expect(sentSql().split('\n').length).toBe(fileContent.split('\n').length);
  });

  test('an ordinary query without a grant is sent unchanged', async () => {
    const sql = `-- >>>\n-- selected-chart: 1\n-- <<<\n${SQL}`;

    await sessions.executeQuery({ sesid: 'ses1', sql }, alice);

    expect(sentSql()).toBe(sql);
  });
});

// executeReader took no request at all, so the session it opened skipped the connection check,
// and it ran any SQL - on MongoDB, JavaScript evaluated in DbGate itself - without a role check.
describe('sessions.executeReader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessions.opened = [];
    testConnectionPermission.mockResolvedValue(undefined);
    testStandardPermission.mockResolvedValue(undefined);
    testDatabaseRolePermission.mockResolvedValue(undefined);
    testConnectionPermission.mockResolvedValue(undefined);
    requireEngineDriver.mockReturnValue({});
    jest.spyOn(sessions, 'create').mockImplementation(async () => {
      openFakeSession('reader1');
      return { sesid: 'reader1' };
    });
  });

  afterEach(() => {
    sessions.create.mockRestore();
  });

  test('checks the connection permission of the caller', async () => {
    testConnectionPermission.mockRejectedValue(new Error('DBGM-00264 Connection permission not granted'));

    await expect(sessions.executeReader({ conid: 'conid1', database: 'db1', sql: SQL }, bob)).rejects.toThrow(
      'permission not granted'
    );
    expect(testConnectionPermission).toHaveBeenCalledWith('conid1', bob);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  test('a SQL query needs the read_content role and opens the session as the caller', async () => {
    await sessions.executeReader({ conid: 'conid1', database: 'db1', sql: SQL }, alice);

    expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'read_content', alice);
    expect(sessions.create).toHaveBeenCalledWith({ conid: 'conid1', database: 'db1' }, alice);
  });

  test('a query of a document database, evaluated as JavaScript, needs run_script', async () => {
    requireEngineDriver.mockReturnValue({ databaseEngineTypes: ['document'] });
    testDatabaseRolePermission.mockRejectedValue(new Error('DBGM-00266 Permission run_script not granted'));

    await expect(
      sessions.executeReader({ conid: 'conid1', database: 'db1', sql: 'db.c.find()' }, alice)
    ).rejects.toThrow('not granted');
    expect(testStandardPermission).toHaveBeenCalledWith('dbops/query', alice);
    expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'run_script', alice);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  test('an app query of a document database needs run_script as well', async () => {
    requireEngineDriver.mockReturnValue({ databaseEngineTypes: ['document'] });
    testDatabaseRolePermission.mockRejectedValue(new Error('DBGM-00266 Permission run_script not granted'));

    await expect(
      sessions.executeReader({ conid: 'conid1', database: 'db1', appFolder: 'app1', queryName: 'q1' }, alice)
    ).rejects.toThrow('not granted');
    expect(testStandardPermission).toHaveBeenCalledWith('dbops/query', alice);
    expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'run_script', alice);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  test('an app query of a SQL database needs only read_content', async () => {
    await sessions.executeReader({ conid: 'conid1', database: 'db1', appFolder: 'app1', queryName: 'q1' }, alice);

    expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'read_content', alice);
    expect(sessions.create).toHaveBeenCalled();
  });

  test.each([
    ['../files/sql', 'evil'],
    ['app1', '../../files/sql/evil'],
    ['app1', 'a\\b'],
    ['.', 'evil'],
    ['app1', '.'],
  ])('refuses an app query path that leaves the app folder (%s, %s)', async (appFolder, queryName) => {
    await expect(
      sessions.executeReader({ conid: 'conid1', database: 'db1', sql: SQL, appFolder, queryName }, alice)
    ).rejects.toThrow('Invalid query name');
    expect(sessions.create).not.toHaveBeenCalled();
  });
});

// /stream is not authenticated and session messages (with the SQL being run) used to be written
// to every connected stream
describe('session events', () => {
  const socket = require('../utility/socket');

  beforeEach(() => {
    jest.clearAllMocks();
    sessions.opened = [];
    testConnectionPermission.mockResolvedValue(undefined);
    fork.mockReturnValue({ on: jest.fn(), send: jest.fn(), kill: jest.fn() });
  });

  test('go only to the stream of the tab that opened the session', async () => {
    const reqFromTab = { ...alice, headers: { 'x-dbgate-strmid': 'tab-a' } };
    const { sesid } = await sessions.create({ conid: 'conid1', database: 'db1' }, reqFromTab);

    sessions.dispatchMessage(sesid, { message: 'Query execution started', sql: SQL });

    expect(socket.emit).toHaveBeenCalledWith(
      `session-info-${sesid}`,
      expect.objectContaining({ sql: SQL }),
      'tab-a'
    );
  });
});

// A session id is only a handle. The routes keyed by it did not check the session's connection,
// nor whether the caller created the session.
describe('routes keyed by a session id', () => {
  const fakeSubprocess = () =>
    Object.assign(new (require('events').EventEmitter)(), { send: jest.fn(), kill: jest.fn() });

  beforeEach(() => {
    jest.clearAllMocks();
    sessions.opened = [];
    testConnectionPermission.mockResolvedValue(undefined);
    testStandardPermission.mockResolvedValue(undefined);
    fork.mockImplementation(fakeSubprocess);
  });

  test('a session created by one user cannot be used by another', async () => {
    const { sesid } = await sessions.create({ conid: 'conid1', database: 'db1' }, alice);

    await expect(sessions.executeQuery({ sesid, sql: 'select 1' }, bob)).rejects.toThrow('another user');
    await expect(sessions.kill({ sesid }, bob)).rejects.toThrow('another user');
    await expect(sessions.startProfiler({ sesid }, bob)).rejects.toThrow('another user');
    expect(await sessions.ping({ sesid }, bob)).toEqual({ state: 'missing' });
    await expect(sessions.executeControlCommand({ sesid, command: 'commitTransaction' }, alice)).resolves.toEqual({
      state: 'ok',
    });
  });

  test('users sharing a userId or logged in with basic auth are told apart', async () => {
    const adCarol = { user: { amoid: 'ad', login: 'carol', licenseUid: 'ad:carol', userId: -1 } };
    const adDave = { user: { amoid: 'ad', login: 'dave', licenseUid: 'ad:dave', userId: -1 } };
    const { sesid } = await sessions.create({ conid: 'conid1', database: 'db1' }, adCarol);
    await expect(sessions.kill({ sesid }, adDave)).rejects.toThrow('another user');

    const basicErin = { auth: { user: 'erin' } };
    const basicFrank = { auth: { user: 'frank' } };
    const { sesid: basicSesid } = await sessions.create({ conid: 'conid1', database: 'db1' }, basicErin);
    await expect(sessions.kill({ sesid: basicSesid }, basicFrank)).rejects.toThrow('another user');
  });

  test('the connection permission is checked for the session connection', async () => {
    const { sesid } = await sessions.create({ conid: 'conid1', database: 'db1' }, alice);
    testConnectionPermission.mockRejectedValue(new Error('DBGM-00264 Connection permission not granted'));
    await expect(sessions.setIsolationLevel({ sesid, level: 'serializable' }, alice)).rejects.toThrow('not granted');
  });

  test('the profiler needs dbops/profiler', async () => {
    testStandardPermission.mockRejectedValue(new Error('DBGM-00265 Permission dbops/profiler not granted'));
    await expect(sessions.startProfiler({ sesid: 'x' }, alice)).rejects.toThrow('dbops/profiler');
  });
});
