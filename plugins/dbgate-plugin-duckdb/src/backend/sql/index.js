const tables = require('./tables.js');
const columns = require('./columns.js');
const foreignKeys = require('./foreignKeys.js');
const primaryKeys = require('./primaryKeys.js');
const indexes = require('./indexes.js');
const uniques = require('./uniques.js');
const views = require('./views.js');
const schemas = require('./schemas.js');

module.exports = {
  tables,
  columns,
  foreignKeys,
  primaryKeys,
  indexes,
  uniques,
  views,
  schemas,
};
