const columns = require('./columns');
const tableModifications = require('./tableList');
const tableList = require('./tableList');
const viewModifications = require('./views');
const matviewModifications = require('./matviews');
const primaryKeys = require('./primaryKeys');
const foreignKeys = require('./foreignKeys');
const views = require('./views');
const matviews = require('./matviews');
const routines = require('./routines');
const routineModifications = require('./routines');
const matviewColumns = require('./matviewColumns');
const indexes = require('./indexes'); // use mysql
//const indexcols = require('./indexcols');
const uniqueNames = require('./uniqueNames');
//const geometryColumns = require('./geometryColumns');
//const geographyColumns = require('./geographyColumns');

//const fk_keyColumnUsage = require('./fk_key_column_usage');
//const fk_referentialConstraints = require('./fk_referential_constraints');
//const fk_tableConstraints = require('./fk_table_constraints');

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
//  indexcols,
  uniqueNames,
  //geometryColumns,
  //geographyColumns,
};
