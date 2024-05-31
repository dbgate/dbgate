const { driverBase } = global.DBGATE_TOOLS;
const Dumper = require('./Dumper');
const { mongoSplitterOptions } = require('dbgate-query-splitter/lib/options');

function jsonStringifyWithObjectId(obj) {
  return JSON.stringify(obj, undefined, 2).replace(
    /\{\s*\"\$oid\"\s*\:\s*\"([0-9a-f]+)\"\s*\}/g,
    (m, id) => `ObjectId("${id}")`
  );
}

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
  databaseEngineTypes: ['document'],
  dialect,
  engine: 'mongo@dbgate-plugin-mongo',
  title: 'MongoDB',
  editorMode: 'javascript',
  defaultPort: 27017,
  supportsDatabaseUrl: true,
  supportsServerSummary: true,
  supportsDatabaseProfiler: true,
  profilerFormatterFunction: 'formatProfilerEntry@dbgate-plugin-mongo',
  profilerTimestampFunction: 'extractProfileTimestamp@dbgate-plugin-mongo',
  profilerChartAggregateFunction: 'aggregateProfileChartEntry@dbgate-plugin-mongo',
  profilerChartMeasures: [
    { label: 'Req count/s', field: 'countPerSec' },
    { label: 'Avg duration', field: 'avgDuration' },
    { label: 'Max duration', field: 'maxDuration' },
  ],
  databaseUrlPlaceholder: 'e.g. mongodb://username:password@mongodb.mydomain.net/dbname',

  getQuerySplitterOptions: () => mongoSplitterOptions,

  showConnectionField: (field, values) => {
    if (field == 'useDatabaseUrl') return true;
    if (values.useDatabaseUrl) {
      return ['databaseUrl', 'defaultDatabase', 'singleDatabase', 'isReadOnly'].includes(field);
    }
    return ['server', 'port', 'user', 'password', 'defaultDatabase', 'singleDatabase', 'isReadOnly'].includes(field);
  },

  importExportArgs: [
    {
      type: 'checkbox',
      name: 'createStringId',
      label: 'Create string _id attribute',
      apiName: 'createStringId',
      direction: 'target',
    },
  ],

  getCollectionUpdateScript(changeSet) {
    let res = '';
    for (const insert of changeSet.inserts) {
      res += `db.${insert.pureName}.insertOne(${jsonStringifyWithObjectId({
        ...insert.document,
        ...insert.fields,
      })});\n`;
    }
    for (const update of changeSet.updates) {
      if (update.document) {
        res += `db.${update.pureName}.replaceOne(${jsonStringifyWithObjectId(
          update.condition
        )}, ${jsonStringifyWithObjectId({
          ...update.document,
          ...update.fields,
        })});\n`;
      } else {
        res += `db.${update.pureName}.updateOne(${jsonStringifyWithObjectId(
          update.condition
        )}, ${jsonStringifyWithObjectId({
          $set: update.fields,
        })});\n`;
      }
    }
    for (const del of changeSet.deletes) {
      res += `db.${del.pureName}.deleteOne(${jsonStringifyWithObjectId(del.condition)});\n`;
    }
    return res;
  },
};

module.exports = driver;
