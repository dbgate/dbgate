const version = require('./version');
const tables = require('./tables');
const columns = require('./columns');
const triggers = require('./triggers');
const primaryKeys = require('./primaryKeys');
const foreignKeys = require('./foreignKeys');
const functions = require('./functions');
const functionParameters = require('./functionParameters');
const procedures = require('./procedures');
const procedureParameters = require('./procedureParameters');
const views = require('./views');
const uniques = require('./uniques');
const indexes = require('./indexes');

module.exports = {
  version,
  columns,
  views,
  tables,
  triggers,
  primaryKeys,
  foreignKeys,
  functions,
  functionParameters,
  procedures,
  procedureParameters,
  uniques,
  indexes,
};
