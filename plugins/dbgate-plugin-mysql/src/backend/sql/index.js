const columns = require('./columns');
const tables = require('./tables');
const primaryKeys = require('./primaryKeys');
const foreignKeys = require('./foreignKeys');
const tableModifications = require('./tableModifications');
const views = require('./views');
const indexes = require('./indexes');
const programmables = require('./programmables');
const procedureModifications = require('./procedureModifications');
const functionModifications = require('./functionModifications');

module.exports = {
  columns,
  tables,
  primaryKeys,
  foreignKeys,
  tableModifications,
  views,
  programmables,
  procedureModifications,
  functionModifications,
  indexes,
};
