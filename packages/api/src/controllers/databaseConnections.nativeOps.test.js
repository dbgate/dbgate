// Regression tests for the native backup / restore routes. They used to take no request, check no
// permission at all, and return the arguments and environment the tool is spawned with - which
// carry the connection password (mysqldump --password=..., PGPASSWORD) - to any logged-in user.

const os = require('os');
const path = require('path');
const fs = require('fs');

const mockDirs = {};

jest.mock('../utility/directories', () => ({
  archivedir: () => mockDirs.archive,
  resolveArchiveFolder: folder => require('path').join(mockDirs.archive, folder),
  uploadsdir: () => mockDirs.uploads,
  filesdir: () => mockDirs.files,
}));
jest.mock('./connections', () => ({
  getCore: jest.fn(async () => ({ _id: 'conid1', engine: 'mysql@dbgate-plugin-mysql', password: 'S3cret-pwd' })),
}));
jest.mock('./runners', () => ({ nativeRunCore: jest.fn(async () => ({ runid: 'r' })), promiseRunCore: jest.fn() }));
jest.mock('./archive', () => ({}));
jest.mock('./config', () => ({ getSettings: jest.fn(async () => ({})) }));
jest.mock('./sessions', () => ({}));
jest.mock('./jsldata', () => ({}));
jest.mock('../utility/socket', () => ({ emit: jest.fn(), emitChanged: jest.fn() }));
jest.mock('../utility/auditlog', () => ({ sendToAuditLog: jest.fn() }));
jest.mock('../utility/authProxy', () => ({}));
jest.mock('../utility/sshTunnel', () => ({ getSshTunnel: jest.fn() }));
jest.mock('../utility/connectUtility', () => ({ extractConnectionSslParams: jest.fn(async () => undefined) }));
jest.mock('../utility/crypting', () => ({ decryptConnection: jest.fn(x => ({ ...x })) }));
jest.mock('../shell/generateDeploySql', () => jest.fn());
jest.mock('../utility/diff2htmlPage', () => jest.fn());
jest.mock('../utility/hasPermission', () => ({
  testConnectionPermission: jest.fn(),
  testStandardPermission: jest.fn(),
  testDatabaseRolePermission: jest.fn(),
  hasPermission: jest.fn(() => true),
  loadPermissionsFromRequest: jest.fn(),
}));

const mockDriver = {
  engine: 'mysql@dbgate-plugin-mysql',
  supportsNativeBackup: true,
  supportsNativeRestore: true,
  backupDatabaseCommand: jest.fn((connection, { outputFile, database }) => ({
    command: 'mysqldump',
    args: [`--password=${connection.password}`, `--result-file=${outputFile}`, database],
    env: { MYSQL_PWD: connection.password },
  })),
  restoreDatabaseCommand: jest.fn((connection, { inputFile, database }) => ({
    command: 'mysql',
    args: [`--password=${connection.password}`, database],
    env: { MYSQL_PWD: connection.password },
    stdinFilePath: inputFile,
  })),
};
jest.mock('../utility/requireEngineDriver', () => jest.fn(() => mockDriver));

const {
  testConnectionPermission,
  testStandardPermission,
  testDatabaseRolePermission,
} = require('../utility/hasPermission');
const connections = require('./connections');
const runners = require('./runners');
const databaseConnections = require('./databaseConnections');

const bob = { user: { userId: 12, login: 'bob' } };
const RUNID = '5d1f3c1e-6a47-11ef-9a4b-0242ac120002';

beforeAll(() => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-nativeops-'));
  mockDirs.archive = path.join(root, 'archive');
  mockDirs.uploads = path.join(root, 'uploads');
  mockDirs.files = path.join(root, 'files');
  for (const dir of [mockDirs.archive, mockDirs.uploads, path.join(mockDirs.files, 'sql')]) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  testConnectionPermission.mockResolvedValue(undefined);
  testStandardPermission.mockResolvedValue(undefined);
  testDatabaseRolePermission.mockResolvedValue(undefined);
});

describe('native backup / restore authorization', () => {
  const backupArgs = () => ({
    conid: 'conid1',
    database: 'db1',
    outputFile: path.join(mockDirs.files, 'sql', 'backup.sql'),
    runid: RUNID,
    options: {},
  });
  const restoreArgs = () => ({
    conid: 'conid1',
    database: 'db1',
    inputFile: path.join(mockDirs.files, 'sql', 'backup.sql'),
    runid: RUNID,
    options: {},
  });

  test.each(['nativeBackup', 'nativeBackupCommand'])(
    '%s checks connection, sql-dump/export and read_content',
    async route => {
      await databaseConnections[route](backupArgs(), bob);
      expect(testConnectionPermission).toHaveBeenCalledWith('conid1', bob);
      expect(testStandardPermission).toHaveBeenCalledWith('dbops/sql-dump/export', bob);
      expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'read_content', bob);
    }
  );

  test.each(['nativeRestore', 'nativeRestoreCommand'])(
    '%s checks connection, sql-dump/import and run_script',
    async route => {
      await databaseConnections[route](restoreArgs(), bob);
      expect(testConnectionPermission).toHaveBeenCalledWith('conid1', bob);
      expect(testStandardPermission).toHaveBeenCalledWith('dbops/sql-dump/import', bob);
      expect(testDatabaseRolePermission).toHaveBeenCalledWith('conid1', 'db1', 'run_script', bob);
    }
  );

  test.each(['nativeBackup', 'nativeBackupCommand', 'nativeRestore', 'nativeRestoreCommand'])(
    '%s does not load the connection without the connection permission',
    async route => {
      testConnectionPermission.mockRejectedValue(new Error('DBGM-00264 Connection permission not granted'));
      const args = route.startsWith('nativeBackup') ? backupArgs() : restoreArgs();
      await expect(databaseConnections[route](args, bob)).rejects.toThrow('permission not granted');
      expect(connections.getCore).not.toHaveBeenCalled();
      expect(runners.nativeRunCore).not.toHaveBeenCalled();
    }
  );
});

describe('native command line responses', () => {
  test('backup command returns only a command line, without the password', async () => {
    const resp = await databaseConnections.nativeBackupCommand(
      {
        conid: 'conid1',
        database: 'db1',
        outputFile: '/x/backup.sql',
        options: {},
        selectedTables: [],
        skippedTables: [],
      },
      bob
    );
    expect(Object.keys(resp)).toEqual(['commandLine']);
    expect(JSON.stringify(resp)).not.toContain('S3cret-pwd');
    expect(resp.commandLine).toContain('--password=********');
  });

  test('restore command returns only a command line, without the password', async () => {
    const resp = await databaseConnections.nativeRestoreCommand(
      { conid: 'conid1', database: 'db1', inputFile: '/x/backup.sql', options: {} },
      bob
    );
    expect(Object.keys(resp)).toEqual(['commandLine']);
    expect(JSON.stringify(resp)).not.toContain('S3cret-pwd');
  });

  test('the spawned backup still gets the real password', async () => {
    await databaseConnections.nativeBackup(
      {
        conid: 'conid1',
        database: 'db1',
        outputFile: path.join(mockDirs.files, 'sql', 'backup.sql'),
        runid: RUNID,
        options: {},
      },
      bob
    );
    expect(runners.nativeRunCore.mock.calls[0][1].args).toContain('--password=S3cret-pwd');
  });
});

describe('native backup / restore input validation (web mode)', () => {
  test.each([[path.join(os.tmpdir(), 'elsewhere.sql')], ['/etc/cron.d/x'], [undefined]])(
    'backup refuses output file %s outside the sql files folder',
    async outputFile => {
      await expect(
        databaseConnections.nativeBackup(
          { conid: 'conid1', database: 'db1', outputFile, runid: RUNID, options: {} },
          bob
        )
      ).rejects.toThrow('SQL files folder');
      expect(runners.nativeRunCore).not.toHaveBeenCalled();
    }
  );

  test('restore refuses an input file outside the uploads and sql files folders', async () => {
    await expect(
      databaseConnections.nativeRestore(
        { conid: 'conid1', database: 'db1', inputFile: '/etc/passwd', runid: RUNID, options: {} },
        bob
      )
    ).rejects.toThrow('uploaded file');
    expect(runners.nativeRunCore).not.toHaveBeenCalled();
  });

  test('restore accepts an uploaded file', async () => {
    const uploadName = '0b9f7c52-6a48-11ef-9a4b-0242ac120002';
    await databaseConnections.nativeRestore(
      {
        conid: 'conid1',
        database: 'db1',
        inputFile: path.join(mockDirs.uploads, uploadName),
        inputUploadName: uploadName,
        runid: RUNID,
        options: {},
      },
      bob
    );
    expect(runners.nativeRunCore).toHaveBeenCalled();
  });

  test.each([['../../tmp/x'], [undefined], ['not-a-uuid']])('rejects runid %s', async runid => {
    await expect(
      databaseConnections.nativeBackup(
        {
          conid: 'conid1',
          database: 'db1',
          outputFile: path.join(mockDirs.files, 'sql', 'backup.sql'),
          runid,
          options: {},
        },
        bob
      )
    ).rejects.toThrow('Invalid runid');
  });

  test('restore into a read-only connection is refused', async () => {
    connections.getCore.mockResolvedValueOnce({ _id: 'conid1', engine: 'mysql@dbgate-plugin-mysql', isReadOnly: true });
    await expect(
      databaseConnections.nativeRestore(
        {
          conid: 'conid1',
          database: 'db1',
          inputFile: path.join(mockDirs.files, 'sql', 'backup.sql'),
          runid: RUNID,
          options: {},
        },
        bob
      )
    ).rejects.toThrow('read-only');
    expect(runners.nativeRunCore).not.toHaveBeenCalled();
  });
});
