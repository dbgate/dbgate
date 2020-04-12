const columns = require('./columns');
const foreignKeys = require('./foreignKeys');
const primaryKeys = require('./primaryKeys');
const tables = require('./tables');
const modifications = require('./modifications');
const loadSqlCode = require('./loadSqlCode');
const views = require('./views');
const programmables = require('./programmables');

module.exports = {
  columns,
  tables,
  foreignKeys,
  primaryKeys,
  modifications,
  loadSqlCode,
  views,
  programmables,
};
