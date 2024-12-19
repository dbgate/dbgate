const columns = require('./columns');
const tableModifications = require('./tableModifications');
const tableList = require('./tableList');
const viewModifications = require('./viewModifications');
const matviewModifications = require('./matviewModifications');
const primaryKeys = require('./primaryKeys');
const views = require('./views');
const matviews = require('./matviews');
const routines = require('./routines');
const routineModifications = require('./routineModifications');
const matviewColumns = require('./matviewColumns');
const indexes = require('./indexes');
const indexcols = require('./indexcols');
const uniqueNames = require('./uniqueNames');
const geometryColumns = require('./geometryColumns');
const geographyColumns = require('./geographyColumns');
const proceduresParameters = require('./proceduresParameters');
const foreignKeys = require('./foreignKeys');
const triggers = require('./triggers');

const fk_keyColumnUsage = require('./fk_key_column_usage');

module.exports = {
  columns,
  tableModifications,
  tableList,
  viewModifications,
  primaryKeys,
  fk_keyColumnUsage,
  foreignKeys,
  views,
  routines,
  routineModifications,
  matviews,
  matviewModifications,
  matviewColumns,
  indexes,
  indexcols,
  uniqueNames,
  geometryColumns,
  geographyColumns,
  proceduresParameters,
  triggers,
};
