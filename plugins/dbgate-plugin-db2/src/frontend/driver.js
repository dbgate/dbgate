const db2SplitterOptions = {
  delimiter: ';',
  ignoreComments: true,
  preventSingleLineSplit: true
};

module.exports = {
  engine: 'db2@dbgate-plugin-db2',
  title: 'IBM DB2',
  defaultPort: 25000,
  defaultDatabase: 'SAMPLE',
  dialect: 'db2',
  showConnectionTab: field => field == 'sshTunnel',
  showConnectionField: (field, values, { config }) => {
    if (field == 'useDatabaseUrl') return true;
    if (values.useDatabaseUrl) {
      return ['databaseUrl', 'isReadOnly'].includes(field);
    }
    return ['server', 'port', 'user', 'password', 'defaultDatabase', 'singleDatabase', 'isReadOnly'].includes(field);
  },
  connectionFields: [
    { field: 'server', type: 'string', label: 'Server', required: true },
    { field: 'port', type: 'number', label: 'Port', required: true, defaultValue: 25000 },
    { field: 'user', type: 'string', label: 'User', required: true },
    { field: 'password', type: 'password', label: 'Password', required: true },
    { field: 'database', type: 'string', label: 'Database', required: true, defaultValue: 'SAMPLE' },
  ],
  icon: 'db2',
  supports: {
    schemas: true,
    tables: true,
    views: true,
    triggers: true,
    procedures: true,
    functions: true,
    users: true,
    roles: true,
    indexes: true,
    foreignKeys: true,
    primaryKeys: true,
    uniqueKeys: true,
    checkConstraints: true,
    defaultValues: true,
    autoIncrement: true,
    comments: true,
    partitions: true,
    materializedViews: true,
    sequences: true,
    types: true,
    domains: true,
    collations: true,
    characterSets: true,
    extensions: true,
    privileges: true,
    grants: true
  },
  id: 'db2',
  name: 'DB2',
  displayName: 'IBM DB2',
  description: 'IBM DB2 Database',
  category: 'database',
  isBuiltin: true,
  sortOrder: -1,  databaseUrlPlaceholder: 'e.g. DATABASE=SAMPLE;HOSTNAME=localhost;PORT=50000;PROTOCOL=TCPIP;UID=user;PWD=password;',
  supportsTransactions: true,
  readOnlySessions: true,
  editorMode: 'sql',
  
  getQuerySplitterOptions: (usage) => 
    usage == 'editor'
      ? { ...db2SplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : usage == 'import'
      ? {
          ...db2SplitterOptions,
        }
      : db2SplitterOptions,
};