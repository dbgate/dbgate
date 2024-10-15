const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const { convertToMongoCondition, convertToMongoSort } = require('./convertToMongoCondition');
const Dumper = require('./Dumper');
const { mongoSplitterOptions } = require('dbgate-query-splitter/lib/options');
const _pickBy = require('lodash/pickBy');
const _fromPairs = require('lodash/fromPairs');

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
  collectionSingularLabel: 'collection',
  collectionPluralLabel: 'collections',

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

  newCollectionFormParams: [
    {
      type: 'text',
      label: 'Collection name',
      name: 'name',
      focused: true,
    },
  ],

  getCollectionUpdateScript(changeSet, collectionInfo) {
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
        const set = _pickBy(update.fields, (v, k) => v !== undefined);
        const unset = _fromPairs(
          Object.keys(update.fields)
            .filter((k) => update.fields[k] === undefined)
            .map((k) => [k, ''])
        );
        const updates = {};
        if (!_.isEmpty(set)) updates.$set = set;
        if (!_.isEmpty(unset)) updates.$unset = unset;

        res += `db.${update.pureName}.updateOne(${jsonStringifyWithObjectId(
          update.condition
        )}, ${jsonStringifyWithObjectId(updates)});\n`;
      }
    }
    for (const del of changeSet.deletes) {
      res += `db.${del.pureName}.deleteOne(${jsonStringifyWithObjectId(del.condition)});\n`;
    }
    return res;
  },

  getFilterBehaviour(dataType, standardFilterBehaviours) {
    return standardFilterBehaviours.mongoFilterBehaviour;
  },

  getCollectionExportQueryScript(collection, condition, sort) {
    return `db.collection('${collection}')
  .find(${JSON.stringify(convertToMongoCondition(condition) || {})})
  .sort(${JSON.stringify(convertToMongoSort(sort) || {})})`;
  },
  getCollectionExportQueryJson(collection, condition, sort) {
    return {
      collection,
      condition: convertToMongoCondition(condition) || {},
      sort: convertToMongoSort(sort) || {},
    };
  },

  dataEditorTypesBehaviour: {
    parseJsonNull: true,
    parseJsonBoolean: true,
    parseNumber: true,
    parseJsonArray: true,
    parseJsonObject: true,
    parseObjectIdAsDollar: true,
    parseDateAsDollar: true,

    explicitDataType: true,
    supportNumberType: true,
    supportStringType: true,
    supportBooleanType: true,
    supportDateType: true,
    supportJsonType: true,
    supportObjectIdType: true,
    supportNullType: true,

    supportFieldRemoval: true,
  },

  getScriptTemplates(objectTypeField) {
    switch (objectTypeField) {
      case 'collections':
        return [
          {
            label: 'JS: dropCollection()',
            scriptTemplate: 'dropCollection',
          },
          {
            label: 'JS: find()',
            scriptTemplate: 'findCollection',
          },
        ];
    }

    return [];
  },

  async getScriptTemplateContent(scriptTemplate, props) {
    switch (scriptTemplate) {
      case 'dropCollection':
        return `db.${props.pureName}.drop();`;
      case 'findCollection':
        return `db.${props.pureName}.find();`;
    }
  },
};

module.exports = driver;
