const columns = require('./columns');
const tableModifications = require('./tableModifications');
const viewModifications = require('./viewModifications');
const primaryKeys = require('./primaryKeys');
const foreignKeys = require('./foreignKeys');
const views = require('./views');
const routines = require('./routines');
const routineModifications = require('./routineModifications');

module.exports = {
  columns,
  tableModifications,
  viewModifications,
  primaryKeys,
  foreignKeys,
  views,
  routines,
  routineModifications,
};
