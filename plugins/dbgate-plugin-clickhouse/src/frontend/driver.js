const { driverBase } = require('dbgate-tools');
const Dumper = require('./Dumper');
const { mysqlSplitterOptions } = require('dbgate-query-splitter/lib/options');
const _cloneDeepWith = require('lodash/cloneDeepWith');

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

  createSaveChangeSetScript(changeSet, dbinfo, defaultCreator) {
    function removeConditionSource(cmd) {
      cmd.where = _cloneDeepWith(cmd.where, (expr) => {
        if (expr.exprType == 'column') {
          return {
            ...expr,
            source: undefined,
          };
        }
      });
    }

    const res = defaultCreator(changeSet, dbinfo);
    for (const cmd of res) {
      if (cmd.commandType == 'update') {
        cmd.alterTableUpdateSyntax = true;
        removeConditionSource(cmd);
      }
      if (cmd.commandType == 'delete') {
        const table = dbinfo?.tables?.find((x) => x.pureName == cmd?.from?.name?.pureName);
        if (table?.tableEngine != 'MergeTree') {
          cmd.alterTableDeleteSyntax = true;
        }
        removeConditionSource(cmd);
      }
    }
    return res;
  },
};

module.exports = driver;
