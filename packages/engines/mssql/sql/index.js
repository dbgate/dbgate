const columns = require('./columns');
const foreignKeys = require('./foreignKeys');
const primaryKeys = require('./primaryKeys');
const tables = require('./tables');
const modifications = require('./modifications');

module.exports = {
  columns,
  tables,
  foreignKeys,
  primaryKeys,
  modifications,
};
