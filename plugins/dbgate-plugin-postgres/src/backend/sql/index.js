const columns = require('./columns');
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
const listDatabases = require('./listDatabases');
const listVariables = require('./listVariables');
const listProcesses = require('./listProcesses');

module.exports = {
  columns,
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
  indexcols,
  uniqueNames,
  geometryColumns,
  geographyColumns,
  proceduresParameters,
  triggers,
  listDatabases,
  listVariables,
  listProcesses,
};
