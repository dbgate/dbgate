const { driverBase } = require('dbgate-tools');
const Dumper = require('./Dumper');
const { mysqlSplitterOptions } = require('dbgate-query-splitter/lib/options');
const _cloneDeepWith = require('lodash/cloneDeepWith');

const clickhouseEngines = [
  'MergeTree',
  'ReplacingMergeTree',
  'SummingMergeTree',
  'AggregatingMergeTree',
  'CollapsingMergeTree',
  'VersionedCollapsingMergeTree',
  'GraphiteMergeTree',
  'Distributed',
  'Log',
  'TinyLog',
  'StripeLog',
  'Memory',
  'File',
  'URL',
  'JDBC',
  'ODBC',
  'Buffer',
  'Null',
  'Kafka',
  'HDFS',
  'S3',
  'Merge',
  'Join',
  'MaterializedView',
  'Dictionary',
  'MySQL',
  'PostgreSQL',
  'MongoDB',
  'EmbeddedRocksDB',
  'View',
  'MaterializeMySQL',
  'MaterializePostgreSQL',
  'ReplicatedMergeTree',
  'ReplicatedReplacingMergeTree',
  'ReplicatedSummingMergeTree',
  'ReplicatedAggregatingMergeTree',
  'ReplicatedCollapsingMergeTree',
  'ReplicatedVersionedCollapsingMergeTree',
  'ReplicatedGraphiteMergeTree',
  'ExternalDistributed',
  'Iceberg',
  'Parquet',
  'ORC',
  'DeltaLake',
];

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
  specificNotNull: true,

  columnProperties: {
    columnComment: true,
  },

  quoteIdentifier(s) {
    return `"${s}"`;
  },

  getTableFormOptions(intent) {
    const isNewTable = intent == 'newTableForm' || intent == 'sqlCreateTable';
    return [
      {
        type: isNewTable ? 'dropdowntext' : 'text',
        options: clickhouseEngines,
        label: 'Engine',
        name: 'tableEngine',
        sqlFormatString: '^engine = %s',
        disabled: !isNewTable,
      },
      {
        type: 'text',
        label: 'Comment',
        name: 'objectComment',
        sqlFormatString: '^comment %v',
      },
    ];
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
