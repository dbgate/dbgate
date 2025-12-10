const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const { redisSplitterOptions } = require('dbgate-query-splitter/lib/options');
const Dumper = require('./Dumper');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar(max)',
  quoteIdentifier(s) {
    return `[${s}]`;
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'redis@dbgate-plugin-redis',
  title: 'Redis',
  defaultPort: 6379,
  editorMode: 'text',
  authTypeFirst: true,
  databaseEngineTypes: ['keyvalue'],
  supportedCreateDatabase: false,
  getQuerySplitterOptions: () => redisSplitterOptions,
  databaseUrlPlaceholder: 'e.g. redis://:authpassword@127.0.0.1:6380/4',
  authTypeLabel: 'Connection mode',
  defaultAuthTypeName: 'node',
  supportedKeyTypes: [
    {
      name: 'string',
      label: 'String',
      dbKeyFields: [{ name: 'value' }],
      addMethod: 'set',
    },
    {
      name: 'list',
      label: 'List',
      dbKeyFields: [{ name: 'value' }],
      addMethod: 'rpush',
      showItemList: true,
    },
    {
      name: 'set',
      label: 'Set',
      dbKeyFields: [{ name: 'value' }],
      keyColumn: 'value',
      addMethod: 'sadd',
      showItemList: true,
    },
    {
      name: 'zset',
      label: 'Sorted Set',
      dbKeyFields: [{ name: 'member' }, { name: 'score' }],
      keyColumn: 'member',
      addMethod: 'zadd',
      showItemList: true,
    },
    {
      name: 'hash',
      label: 'Hash',
      dbKeyFields: [{ name: 'key' }, { name: 'value' }],
      keyColumn: 'key',
      addMethod: 'hset',
      showItemList: true,
    },
    {
      name: 'stream',
      label: 'Stream',
      dbKeyFields: [{ name: 'id' }, { name: 'value' }],
      keyColumn: 'id',
      addMethod: 'xaddjson',
      showItemList: true,
    },
    {
      name: 'json',
      label: 'JSON',
      dbKeyFields: [{ name: 'value' }],
      addMethod: 'json.set',
    }
  ],

  showConnectionField: (field, values) => {
    if (field == 'useDatabaseUrl') return values.authType != 'cluster';
    if (field == 'authType') return !values.useDatabaseUrl;
    if (values.useDatabaseUrl) {
      return ['databaseUrl', 'isReadOnly', 'treeKeySeparator'].includes(field);
    }
    if (values.authType == 'cluster') {
      return ['user', 'password', 'isReadOnly', 'treeKeySeparator', 'clusterNodes', 'autoDetectNatMap'].includes(field);
    }
    return ['server', 'port', 'user', 'password', 'isReadOnly', 'treeKeySeparator'].includes(field);
  },

  getAdvancedConnectionFields() {
    return [
      {
        type: 'checkbox',
        name: 'skipSetName',
        label: 'Skip SETNAME instruction',
      },
    ];
  },
};

module.exports = driver;
