const _isString = require('lodash/isString');
const { driverBase } = global.DBGATE_TOOLS;
const Dumper = require('./Dumper');
const { mongoSplitterOptions } = require('dbgate-query-splitter/lib/options');

const mongoIdRegex = /^[0-9a-f]{24}$/;

function getConditionPreview(condition) {
  if (condition && _isString(condition._id) && condition._id.match(mongoIdRegex)) {
    return `{ _id: { $in: ['${condition._id}', ObjectId('${condition._id}')] } }`;
  }
  return JSON.stringify(condition);
}

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar(max)',
  nosql: true,
  quoteIdentifier(s) {
    return `[${s}]`;
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'mongo@dbgate-plugin-mongo',
  title: 'MongoDB',
  defaultPort: 27017,
  supportsDatabaseUrl: true,
  databaseUrlPlaceholder: 'e.g. mongodb://username:password@mongodb.mydomain.net/dbname',

  getQuerySplitterOptions: () => mongoSplitterOptions,

  showConnectionField: (field, values) => {
    if (field == 'useDatabaseUrl') return true;
    if (values.useDatabaseUrl) {
      return ['databaseUrl', 'defaultDatabase', 'singleDatabase'].includes(field);
    }
    return ['server', 'port', 'user', 'password', 'defaultDatabase', 'singleDatabase'].includes(field);
  },

  getCollectionUpdateScript(changeSet) {
    let res = '';
    for (const insert of changeSet.inserts) {
      res += `db.${insert.pureName}.insert(${JSON.stringify(
        {
          ...insert.document,
          ...insert.fields,
        },
        undefined,
        2
      )});\n`;
    }
    for (const update of changeSet.updates) {
      if (update.document) {
        res += `db.${update.pureName}.replaceOne(${getConditionPreview(update.condition)}, ${JSON.stringify(
          {
            ...update.document,
            ...update.fields,
          },
          undefined,
          2
        )});\n`;
      } else {
        res += `db.${update.pureName}.updateOne(${getConditionPreview(update.condition)}, ${JSON.stringify(
          {
            $set: update.fields,
          },
          undefined,
          2
        )});\n`;
      }
    }
    for (const del of changeSet.deletes) {
      res += `db.${del.pureName}.deleteOne(${getConditionPreview(del.condition)});\n`;
    }
    return res;
  },
};

module.exports = driver;
