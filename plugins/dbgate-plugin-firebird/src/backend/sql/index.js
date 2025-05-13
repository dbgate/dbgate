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

module.exports = {
  version,
  columns,
  tables,
  triggers,
  primaryKeys,
  foreignKeys,
  functions,
  functionParameters,
  procedures,
  procedureParameters,
};
