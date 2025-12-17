const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const { convertToMongoCondition, convertToMongoSort } = require('./convertToMongoCondition');
const Dumper = require('./Dumper');
const { mongoSplitterOptions } = require('dbgate-query-splitter/lib/options');
const _pickBy = require('lodash/pickBy');
const _fromPairs = require('lodash/fromPairs');

const mongoIcon = '<svg height="2500" viewBox="8.738 -5.03622834 17.45992422 39.40619484" width="2500" xmlns="http://www.w3.org/2000/svg"><path d="m15.9.087.854 1.604c.192.296.4.558.645.802a22.406 22.406 0 0 1 2.004 2.266c1.447 1.9 2.423 4.01 3.12 6.292.418 1.394.645 2.824.662 4.27.07 4.323-1.412 8.035-4.4 11.12a12.7 12.7 0 0 1 -1.57 1.342c-.296 0-.436-.227-.558-.436a3.589 3.589 0 0 1 -.436-1.255c-.105-.523-.174-1.046-.14-1.586v-.244c-.024-.052-.285-24.052-.181-24.175z" fill="#599636"/><path d="m15.9.034c-.035-.07-.07-.017-.105.017.017.35-.105.662-.296.96-.21.296-.488.523-.767.767-1.55 1.342-2.77 2.963-3.747 4.776-1.3 2.44-1.97 5.055-2.16 7.808-.087.993.314 4.497.627 5.508.854 2.684 2.388 4.933 4.375 6.885.488.47 1.01.906 1.55 1.325.157 0 .174-.14.21-.244a4.78 4.78 0 0 0 .157-.68l.35-2.614z" fill="#6cac48"/><path d="m16.754 28.845c.035-.4.227-.732.436-1.063-.21-.087-.366-.26-.488-.453a3.235 3.235 0 0 1 -.26-.575c-.244-.732-.296-1.5-.366-2.248v-.453c-.087.07-.105.662-.105.75a17.37 17.37 0 0 1 -.314 2.353c-.052.314-.087.627-.28.906 0 .035 0 .07.017.122.314.924.4 1.865.453 2.824v.35c0 .418-.017.33.33.47.14.052.296.07.436.174.105 0 .122-.087.122-.157l-.052-.575v-1.604c-.017-.28.035-.558.07-.82z" fill="#c2bfbf"/></svg>';

function mongoReplacer(key, value) {
  if (typeof value === 'bigint') {
    return { $bigint: value.toString() };
  }
  return value;
}

function jsonStringifyWithObjectId(obj) {
  return JSON.stringify(obj, mongoReplacer, 2)
    .replace(/\{\s*\"\$oid\"\s*\:\s*\"([0-9a-f]+)\"\s*\}/g, (m, id) => `ObjectId("${id}")`)
    .replace(/\{\s*\"\$bigint\"\s*\:\s*\"([0-9]+)\"\s*\}/g, (m, num) => `${num}n`)
    .replace(
      /\{\s*"\$binary"\s*:\s*\{\s*"base64"\s*:\s*"([^"]+)"(?:\s*,\s*"subType"\s*:\s*"([0-9a-fA-F]{2})")?\s*\}\s*\}/g,
      (m, base64, subType) => {
        return `BinData(${parseInt(subType || '00', 16)}, "${base64}")`;
      }
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
const mongoDriverBase = {
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
  // temporatily disable MongoDB profiler support
  supportsDatabaseProfiler: false,
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
  icon: mongoIcon,

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
      res += `db.getCollection('${insert.pureName}').insertOne(${jsonStringifyWithObjectId({
        ...insert.document,
        ...insert.fields,
      })});\n`;
    }
    for (const update of changeSet.updates) {
      if (update.document) {
        res += `db.getCollection('${update.pureName}').replaceOne(${jsonStringifyWithObjectId(
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

        res += `db.getCollection('${update.pureName}').updateOne(${jsonStringifyWithObjectId(
          update.condition
        )}, ${jsonStringifyWithObjectId(updates)});\n`;
      }
    }
    for (const del of changeSet.deletes) {
      res += `db.getCollection('${del.pureName}').deleteOne(${jsonStringifyWithObjectId(del.condition)});\n`;
    }
    return res;
  },

  getFilterBehaviour(dataType, standardFilterBehaviours) {
    return standardFilterBehaviours.mongoFilterBehaviour;
  },

  getCollectionExportQueryScript(collection, condition, sort) {
    return `db.getCollection('${collection}')
  .find(${jsonStringifyWithObjectId(convertToMongoCondition(condition) || {})})
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
    parseHexAsBuffer: true,

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
        return `db.getCollection('${props.pureName}').drop();`;
      case 'findCollection':
        return `db.getCollection('${props.pureName}').find();`;
    }
  },
};

const mongoDriver = {
  ...mongoDriverBase,
};

const legacyMongoDriver = {
  ...mongoDriverBase,
  engine: 'mongo-legacy@dbgate-plugin-mongo',
  title: 'MongoDB 4 - Legacy',
  premiumOnly: true,
  useLegacyDriver: true,
};

module.exports = [mongoDriver, legacyMongoDriver];
