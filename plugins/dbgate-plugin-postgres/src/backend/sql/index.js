const columns = require('./columns');
const tableModifications = require('./tableModifications');
const tableList = require('./tableList');
const viewModifications = require('./viewModifications');
const matviewModifications = require('./matviewModifications');
const primaryKeys = require('./primaryKeys');
const foreignKeys = require('./foreignKeys');
const views = require('./views');
const matviews = require('./matviews');
const routines = require('./routines');
const routineModifications = require('./routineModifications');
const matviewColumns = require('./matviewColumns');
const indexes = require('./indexes');

module.exports = {
  columns,
  tableModifications,
  tableList,
  viewModifications,
  primaryKeys,
  foreignKeys,
  views,
  routines,
  routineModifications,
  matviews,
  matviewModifications,
  matviewColumns,
  indexes,
};
