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
const indexcols = require('./indexcols');
const uniqueNames = require('./uniqueNames');

const fk_keyColumnUsage = require('./fk_key_column_usage');
const fk_referentialConstraints = require('./fk_referential_constraints');
const fk_tableConstraints = require('./fk_table_constraints');

module.exports = {
  columns,
  tableModifications,
  tableList,
  viewModifications,
  primaryKeys,
  foreignKeys,
  fk_keyColumnUsage,
  fk_referentialConstraints,
  fk_tableConstraints,
  views,
  routines,
  routineModifications,
  matviews,
  matviewModifications,
  matviewColumns,
  indexes,
  indexcols,
  uniqueNames,
};
