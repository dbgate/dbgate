const version = require('./version');
const capabilities = require('./capabilities');
const tables = require('./tables');
const columns = require('./columns');
const triggers = require('./triggers');
const primaryKeys = require('./primaryKeys');
const foreignKeys = require('./foreignKeys');
const functions = require('./functions');
const functionsLegacy = require('./functionsLegacy');
const functionParameters = require('./functionParameters');
const functionParametersLegacy = require('./functionParametersLegacy');
const procedures = require('./procedures');
const procedureParameters = require('./procedureParameters');
const views = require('./views');
const uniques = require('./uniques');
const indexes = require('./indexes');

module.exports = {
  version,
  capabilities,
  columns,
  views,
  tables,
  triggers,
  primaryKeys,
  foreignKeys,
  functions,
  functionsLegacy,
  functionParameters,
  functionParametersLegacy,
  procedures,
  procedureParameters,
  uniques,
  indexes,
};
