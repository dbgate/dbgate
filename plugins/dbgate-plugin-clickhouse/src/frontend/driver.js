const { driverBase } = require('dbgate-tools');
const Dumper = require('./Dumper');
const { mysqlSplitterOptions } = require('dbgate-query-splitter/lib/options');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  stringEscapeChar: "'",
  fallbackDataType: 'String',

  createColumn: true,
  dropColumn: true,
  changeColumn: true,
  createIndex: true,
  dropIndex: true,
  anonymousPrimaryKey: true,
  createColumnWithColumnKeyword: true,

  columnProperties: {
    columnComment: true,
  },

  quoteIdentifier(s) {
    return `"${s}"`;
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'clickhouse@dbgate-plugin-clickhouse',
  title: 'ClickHouse',
  showConnectionField: (field, values) => {
    return ['databaseUrl', 'defaultDatabase', 'singleDatabase', 'isReadOnly', 'user', 'password'].includes(field);
  },
  getQuerySplitterOptions: (usage) =>
    usage == 'editor'
      ? { ...mysqlSplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : mysqlSplitterOptions,
};

module.exports = driver;
