const columns = require('./columns');
const foreignKeys = require('./foreignKeys');
const primaryKeys = require('./primaryKeys');
const tables = require('./tables');
const tableSizes = require('./tableSizes');
const modifications = require('./modifications');
const loadSqlCode = require('./loadSqlCode');
const views = require('./views');
const programmables = require('./programmables');
const proceduresParameters = require('./proceduresParameters');
const functionParameters = require('./functionParameters');
const viewColumns = require('./viewColumns');
const indexes = require('./indexes');
const indexcols = require('./indexcols');
const triggers = require('./triggers');

module.exports = {
  columns,
  tables,
  foreignKeys,
  primaryKeys,
  modifications,
  loadSqlCode,
  views,
  programmables,
  proceduresParameters,
  functionParameters,
  viewColumns,
  indexes,
  indexcols,
  tableSizes,
  triggers,
};
