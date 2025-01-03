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
const uniqueNames = require('./uniqueNames');
const viewTexts = require('./viewTexts');
const parameters = require('./parameters');
const triggers = require('./triggers');
const schedulerEvents = require('./schedulerEvents.js');

module.exports = {
  columns,
  tables,
  primaryKeys,
  foreignKeys,
  tableModifications,
  views,
  programmables,
  parameters,
  procedureModifications,
  functionModifications,
  indexes,
  uniqueNames,
  viewTexts,
  triggers,
  schedulerEvents,
};
