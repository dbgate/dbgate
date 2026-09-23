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
jest.mock('../utility/socket', () => ({ emit: jest.fn(), emitChanged: jest.fn() }));
jest.mock('../utility/auditlog', () => ({ sendToAuditLog: jest.fn() }));
jest.mock('../utility/pipeForkLogs', () => jest.fn());
jest.mock('../utility/processComm', () => ({ handleProcessCommunication: jest.fn(() => false) }));
jest.mock('../utility/hasPermission', () => ({
  testStandardPermission: jest.fn(),
  testDatabaseRolePermission: jest.fn(),
  testConnectionPermission: jest.fn(),
}));
jest.mock('child_process', () => ({ fork: jest.fn() }));

const { fork } = require('child_process');
const {
  testStandardPermission,
  testDatabaseRolePermission,
  testConnectionPermission,
} = require('../utility/hasPermission');
const { createTeamFileExecToken } = require('../utility/teamFileExecToken');
const { execGrantStillStands } = require('./teamFiles');
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
