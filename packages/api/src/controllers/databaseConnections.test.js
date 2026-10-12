// Regression tests for the database-connection routes that ran scripts, backups and restores with
// only a connection check - or none at all:
//
//   * evalJsonScript ran a JSON shell script without the directory check runners.start applies,
//     so its readers and writers could open any file on the server.
//   * executeSessionQuery (the query tab of DuckDB) skipped the run_script database role.
//   * nativeBackup / nativeRestore and their *Command variants had no permission check, took any
//     output / input path, and the command variants returned the connection password.

const os = require('os');
const path = require('path');
const fsNode = require('fs');

const mockDataDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-dbconn-test-'));

jest.mock('../utility/directories', () => {
  const path = require('path');
  const dir = name => path.join(mockDataDir, name);
  return {
    filesdir: () => dir('files'),
    uploadsdir: () => dir('uploads'),
    archivedir: () => dir('archive'),
    appdir: () => dir('apps'),
    rundir: () => dir('run'),
    resolveArchiveFolder: folder => path.join(dir('archive'), folder),
  };
});
jest.mock('./connections', () => ({ getCore: jest.fn(async () => ({ _id: 'conid1', engine: 'x' })) }));
jest.mock('./runners', () => ({ nativeRunCore: jest.fn(() => ({ runid: 'r' })), promiseRunCore: jest.fn() }));
jest.mock('./archive', () => ({}));
jest.mock('./config', () => ({ getSettings: jest.fn(async () => ({})) }));
jest.mock('./sessions', () => ({ dispatchMessage: jest.fn() }));
jest.mock('./jsldata', () => ({}));
// the real owner bookkeeping, with the writes to event streams mocked
jest.mock('../utility/socket', () => ({
  ...jest.requireActual('../utility/socket'),
  emit: jest.fn(),
  emitChanged: jest.fn(),
}));
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

const {
  testConnectionPermission,
  testStandardPermission,
  testDatabaseRolePermission,
} = require('../utility/hasPermission');
const connections = require('./connections');
const runners = require('./runners');
const databaseConnections = require('./databaseConnections');

const req = { user: { userId: 11, login: 'alice' } };
const RUNID = 'c56a4180-65aa-42ec-a945-5fd21dec0538';
const sqlFilesDir = path.join(mockDataDir, 'files', 'sql');
const uploadsDir = path.join(mockDataDir, 'uploads');
fsNode.mkdirSync(sqlFilesDir, { recursive: true });
fsNode.mkdirSync(uploadsDir, { recursive: true });

const denied = () => Promise.reject(new Error('DBGM-00265 Permission not granted'));

let subprocess;
beforeEach(() => {
  jest.clearAllMocks();
  subprocess = { send: jest.fn() };
  jest.spyOn(databaseConnections, 'ensureOpened').mockResolvedValue({ subprocess });
  testConnectionPermission.mockResolvedValue(undefined);
  testStandardPermission.mockResolvedValue(undefined);
  testDatabaseRolePermission.mockResolvedValue(undefined);
  connections.getCore.mockResolvedValue({ _id: 'conid1', engine: 'x' });
});

function scriptReading(fileName) {
  return {
    type: 'json',
    commands: [
      { type: 'assign', variableName: 'a', functionName: 'jsonLinesReader', props: { fileName } },
      {
        type: 'assign',
        variableName: 'b',
        functionName: 'jsonLinesWriter',
        props: { fileName: 'leak.jsonl' },
      },
      { type: 'copyStream', sourceVar: 'a', targetVar: 'b' },
    ],
  };
}

describe('evalJsonScript', () => {
  test('refuses a script that reads a file outside the data directories', async () => {
    await expect(
      databaseConnections.evalJsonScript(
        { conid: 'conid1', database: 'db1', runid: RUNID, script: scriptReading('/etc/passwd') },
        req
      )
    ).rejects.toThrow('Unallowed directories');
    expect(subprocess.send).not.toHaveBeenCalled();
  });

  test('refuses a runid that is not an id', async () => {
    await expect(
      databaseConnections.evalJsonScript(
        { conid: 'conid1', database: 'db1', runid: '../../tmp/x', script: scriptReading('data.jsonl') },
        req
      )
    ).rejects.toThrow('Invalid runid');
    expect(subprocess.send).not.toHaveBeenCalled();
  });

  test('requires the read_content role', async () => {
    testDatabaseRolePermission.mockImplementation(denied);
    await expect(
      databaseConnections.evalJsonScript(
        { conid: 'conid1', database: 'db1', runid: RUNID, script: scriptReading('data.jsonl') },
        req
      )
    ).rejects.toThrow('not granted');
    expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'read_content', req);
  });

  test('runs a script that stays in the data directories', async () => {
    const script = scriptReading(path.join(mockDataDir, 'files', 'data.jsonl'));
    await databaseConnections.evalJsonScript({ conid: 'conid1', database: 'db1', runid: RUNID, script }, req);
    expect(subprocess.send).toHaveBeenCalledWith(expect.objectContaining({ msgtype: 'evalJsonScript', runid: RUNID }));
  });
});

describe('executeSessionQuery', () => {
  test('requires dbops/query and the run_script role, like sessions.executeQuery', async () => {
    testDatabaseRolePermission.mockImplementation(denied);
    await expect(
      databaseConnections.executeSessionQuery({ sesid: 's', conid: 'conid1', database: 'db1', sql: 'select 1' }, req)
    ).rejects.toThrow('not granted');
    expect(testStandardPermission).toHaveBeenCalledWith('dbops/query', req);
    expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'run_script', req);
    expect(subprocess.send).not.toHaveBeenCalled();
  });
});

describe('native backup and restore', () => {
  const driver = {
    supportsNativeBackup: true,
    supportsNativeRestore: true,
    backupDatabaseCommand: (connection, { outputFile }) => ({
      command: 'mysqldump',
      args: [`--password=${connection.password}`, `--result-file=${outputFile}`],
      env: { MYSQL_PWD: connection.password },
    }),
    restoreDatabaseCommand: (connection, { inputFile }) => ({
      command: 'mysql',
      args: [`--password=${connection.password}`],
      stdinFilePath: inputFile,
    }),
  };

  beforeEach(() => {
    jest.spyOn(databaseConnections, 'getNativeOpContext').mockResolvedValue({
      connection: { password: 's3cret-pw' },
      driver,
      externalTools: {},
      settings: {},
    });
  });

  test('backup requires the sql-dump export permission', async () => {
    testStandardPermission.mockImplementation(denied);
    await expect(
      databaseConnections.nativeBackup(
        { conid: 'conid1', database: 'db1', outputFile: path.join(sqlFilesDir, 'a.sql'), runid: RUNID },
        req
      )
    ).rejects.toThrow('not granted');
    expect(testStandardPermission).toHaveBeenCalledWith('dbops/sql-dump/export', req, []);
    expect(runners.nativeRunCore).not.toHaveBeenCalled();
  });

  test('backup refuses an output file outside the SQL files folder', async () => {
    await expect(
      databaseConnections.nativeBackup(
        { conid: 'conid1', database: 'db1', outputFile: path.join(mockDataDir, 'elsewhere.sql'), runid: RUNID },
        req
      )
    ).rejects.toThrow('SQL files folder');
    expect(runners.nativeRunCore).not.toHaveBeenCalled();
  });

  test('backup into the SQL files folder runs', async () => {
    await databaseConnections.nativeBackup(
      { conid: 'conid1', database: 'db1', outputFile: path.join(sqlFilesDir, 'a.sql'), runid: RUNID },
      req
    );
    expect(runners.nativeRunCore).toHaveBeenCalled();
  });

  test('the copied backup command line does not contain the password', async () => {
    const resp = await databaseConnections.nativeBackupCommand(
      { conid: 'conid1', database: 'db1', outputFile: path.join(sqlFilesDir, 'a.sql') },
      req
    );
    expect(resp.commandLine).toContain('mysqldump');
    expect(JSON.stringify(resp)).not.toContain('s3cret-pw');
  });

  test('restore requires the sql-dump import permission and the run_script role', async () => {
    testDatabaseRolePermission.mockImplementation(denied);
    await expect(
      databaseConnections.nativeRestore(
        { conid: 'conid1', database: 'db1', inputFile: path.join(sqlFilesDir, 'a.sql'), runid: RUNID },
        req
      )
    ).rejects.toThrow('not granted');
    expect(testStandardPermission).toHaveBeenCalledWith('dbops/sql-dump/import', req, []);
    expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'run_script', req);
  });

  test('restore refuses a read-only connection', async () => {
    connections.getCore.mockResolvedValue({ _id: 'conid1', isReadOnly: true });
    await expect(
      databaseConnections.nativeRestore(
        { conid: 'conid1', database: 'db1', inputFile: path.join(sqlFilesDir, 'a.sql'), runid: RUNID },
        req
      )
    ).rejects.toThrow('read-only');
  });

  test('restore refuses an input file outside the SQL files folder', async () => {
    await expect(
      databaseConnections.nativeRestore(
        { conid: 'conid1', database: 'db1', inputFile: '/etc/passwd', runid: RUNID },
        req
      )
    ).rejects.toThrow('SQL files folder');
    expect(runners.nativeRunCore).not.toHaveBeenCalled();
  });

  test('restore of an uploaded dump runs', async () => {
    const inputFile = path.join(uploadsDir, RUNID);
    await databaseConnections.nativeRestore(
      { conid: 'conid1', database: 'db1', inputFile, inputUploadName: RUNID, runid: RUNID },
      req
    );
    expect(runners.nativeRunCore).toHaveBeenCalled();
  });
});

// exportModel / exportModelSql wrote the model into any folder or file the client named
describe('model export destinations', () => {
  const exportDbModel = require('../utility/exportDbModel');
  const exportDbModelSql = require('../utility/exportDbModelSql');

  beforeEach(() => {
    jest.spyOn(databaseConnections, 'structure').mockResolvedValue({ tables: [] });
  });

  test('exportModel refuses a folder outside the archive', async () => {
    await expect(
      databaseConnections.exportModel({ conid: 'conid1', database: 'db1', outputFolder: '/tmp/anywhere' }, req)
    ).rejects.toThrow('archive folder');
    expect(exportDbModel).not.toHaveBeenCalled();
  });

  test('exportModel writes into an archive folder', async () => {
    await databaseConnections.exportModel({ conid: 'conid1', database: 'db1', outputFolder: 'archive:default' }, req);
    expect(exportDbModel).toHaveBeenCalledWith(expect.anything(), path.join(mockDataDir, 'archive', 'default'));
  });

  test('exportModelSql refuses a folder', async () => {
    await expect(
      databaseConnections.exportModelSql({ conid: 'conid1', database: 'db1', outputFolder: '/tmp/anywhere' }, req)
    ).rejects.toThrow('outside managed data directories');
    expect(exportDbModelSql).not.toHaveBeenCalled();
  });

  test('exportModelSql refuses a file outside the data directories', async () => {
    await expect(
      databaseConnections.exportModelSql({ conid: 'conid1', database: 'db1', outputFile: '/tmp/model.sql' }, req)
    ).rejects.toThrow('outside managed data directories');
    expect(exportDbModelSql).not.toHaveBeenCalled();
  });

  test('exportModelSql writes a file into the uploads folder', async () => {
    const outputFile = path.join(uploadsDir, 'model.sql');
    await databaseConnections.exportModelSql({ conid: 'conid1', database: 'db1', outputFile }, req);
    expect(exportDbModelSql).toHaveBeenCalledWith(expect.anything(), expect.anything(), undefined, outputFile);
  });
});
