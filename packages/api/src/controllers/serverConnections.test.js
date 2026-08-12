jest.mock('./connections', () => ({
  getCore: jest.fn(),
}));
jest.mock('./databaseConnections', () => ({
  ensureStructureLoaded: jest.fn(),
  queryData: jest.fn(),
  queryServerChatData: jest.fn(),
  structure: jest.fn(),
}));
jest.mock('../utility/socket', () => ({
  emitChanged: jest.fn(),
  setStreamIdFilter: jest.fn(),
}));
jest.mock('../utility/hasPermission', () => ({
  getDatabasePermissionRole: jest.fn(),
  hasPermission: jest.fn(),
  loadDatabasePermissionsFromRequest: jest.fn(),
  loadPermissionsFromRequest: jest.fn(),
  testConnectionPermission: jest.fn(),
  testStandardPermission: jest.fn(),
}));
jest.mock('../utility/auditlog', () => ({
  sendToAuditLog: jest.fn(),
}));

const connections = require('./connections');
const databaseConnections = require('./databaseConnections');
const {
  hasPermission,
  loadPermissionsFromRequest,
  testConnectionPermission,
  testStandardPermission,
} = require('../utility/hasPermission');
const serverConnections = require('./serverConnections');
const {
  ensureServerChatQueryAllowed,
  limitServerChatQueryResult,
  resolveServerChatDatabaseName,
} = require('../utility/serverChatQuery');

const originalMethods = {
  canonicalizeChatDatabase: serverConnections.canonicalizeChatDatabase,
  ensureOpened: serverConnections.ensureOpened,
  loadChatDatabases: serverConnections.loadChatDatabases,
  requireServerChat: serverConnections.requireServerChat,
  sendRequest: serverConnections.sendRequest,
};
const originalStorageDatabase = process.env.STORAGE_DATABASE;

describe('server chat controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(serverConnections, originalMethods);
    if (originalStorageDatabase == null) delete process.env.STORAGE_DATABASE;
    else process.env.STORAGE_DATABASE = originalStorageDatabase;
  });

  afterAll(() => {
    Object.assign(serverConnections, originalMethods);
    if (originalStorageDatabase == null) delete process.env.STORAGE_DATABASE;
    else process.env.STORAGE_DATABASE = originalStorageDatabase;
  });

  test('requires all-tables permission for Team server chat', async () => {
    process.env.STORAGE_DATABASE = 'team-storage';
    loadPermissionsFromRequest.mockResolvedValue(['*', '~all-tables']);
    testConnectionPermission.mockResolvedValue();
    testStandardPermission.mockResolvedValue();
    hasPermission.mockImplementation(permission => permission != 'all-tables');
    connections.getCore.mockResolvedValue({
      engine: 'mssql@dbgate-plugin-mssql',
      singleDatabase: false,
    });
    serverConnections.ensureOpened = jest.fn();

    await expect(serverConnections.requireServerChat('con1', {})).rejects.toThrow(
      'DBGM-00000 Permission all-tables not granted'
    );
    expect(serverConnections.ensureOpened).not.toHaveBeenCalled();
  });

  test('waits for structure and reapplies permission-aware structure response', async () => {
    const opened = { conid: 'con1' };
    const structure = { tables: [{ pureName: 'Orders', schemaName: 'dbo' }] };
    serverConnections.requireServerChat = jest.fn().mockResolvedValue({ opened });
    serverConnections.canonicalizeChatDatabase = jest.fn().mockResolvedValue('CustomerA');
    databaseConnections.ensureStructureLoaded.mockResolvedValue(structure);
    databaseConnections.structure.mockResolvedValue(structure);

    const request = {};
    await expect(serverConnections.databaseStructure({ conid: 'con1', database: 'customera' }, request)).resolves.toBe(
      structure
    );
    expect(databaseConnections.ensureStructureLoaded).toHaveBeenCalledWith('con1', 'CustomerA');
    expect(databaseConnections.structure).toHaveBeenCalledWith({ conid: 'con1', database: 'CustomerA' }, request);
  });

  test('canonicalizes database SQL and uses the dedicated capped subprocess request', async () => {
    const opened = { conid: 'con1' };
    const rows = Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }));
    const queryResponse = {
      columns: [{ columnName: 'id' }],
      rows,
      returnedRowCount: 100,
      truncated: true,
    };
    serverConnections.requireServerChat = jest.fn().mockResolvedValue({ opened });
    serverConnections.canonicalizeChatDatabase = jest.fn().mockResolvedValue('CustomerA');
    databaseConnections.queryServerChatData.mockResolvedValue(queryResponse);

    const response = await serverConnections.queryDatabaseData({
      conid: 'con1',
      database: 'customera',
      sql: 'SELECT id FROM dbo.Orders',
    });

    expect(databaseConnections.queryServerChatData).toHaveBeenCalledWith({
      conid: 'con1',
      database: 'CustomerA',
      sql: 'SELECT id FROM dbo.Orders',
    });
    expect(databaseConnections.queryData).not.toHaveBeenCalled();
    expect(response).toBe(queryResponse);
    expect(response.rows).toHaveLength(100);
    expect(response.returnedRowCount).toBe(100);
    expect(response.truncated).toBe(true);
    expect(response.columns).toEqual([{ columnName: 'id' }]);
  });

  test('caps server chat rows without mutating the original query result', () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({ id: index + 1 }));
    const original = { columns: [{ columnName: 'id' }], rows };

    const response = limitServerChatQueryResult(original);

    expect(response.rows).toHaveLength(100);
    expect(response.returnedRowCount).toBe(100);
    expect(response.truncated).toBe(true);
    expect(original.rows).toHaveLength(101);
  });

  test('reports zero returned rows for a server chat result without a row set', () => {
    expect(limitServerChatQueryResult({ status: 'ok' })).toEqual({
      status: 'ok',
      returnedRowCount: 0,
      truncated: false,
    });
  });

  test('rejects server SQL before execution for a read-only MSSQL connection', () => {
    expect(() => ensureServerChatQueryAllowed({ isReadOnly: true }, { readOnlySessions: false })).toThrow(
      'DBGM-00000 Connection is read only'
    );
    expect(() => ensureServerChatQueryAllowed({ isReadOnly: true }, { readOnlySessions: true })).not.toThrow();
  });

  test('resolves exact database casing before case-insensitive matches', () => {
    const databases = ['Customer', 'customer'];

    expect(resolveServerChatDatabaseName(databases, 'Customer')).toBe('Customer');
    expect(resolveServerChatDatabaseName(databases, 'customer')).toBe('customer');
  });

  test('resolves a unique case-insensitive database match', () => {
    expect(resolveServerChatDatabaseName(['Customer'], 'CUSTOMER')).toBe('Customer');
  });

  test('rejects an ambiguous case-insensitive database match', () => {
    expect(() => resolveServerChatDatabaseName(['Customer', 'customer'], 'CUSTOMER')).toThrow(
      'DBGM-00000 Database name "CUSTOMER" is ambiguous; use exact casing from get_databases'
    );
  });

  test('returns null when the database is missing', () => {
    expect(resolveServerChatDatabaseName(['Customer'], 'Missing')).toBeNull();
  });
});
