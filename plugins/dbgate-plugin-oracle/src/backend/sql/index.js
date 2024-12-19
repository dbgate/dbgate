const columns = require('./columns');
const tableList = require('./tableList');
const primaryKeys = require('./primaryKeys');
const foreignKeys = require('./foreignKeys');
const views = require('./views');
const matviews = require('./matviews');
const routines = require('./routines');
const parameters = require('./parameters');
const indexes = require('./indexes'); // use mysql
const triggers = require('./triggers');
//const indexcols = require('./indexcols');
const uniqueNames = require('./uniqueNames');
//const geometryColumns = require('./geometryColumns');
//const geographyColumns = require('./geographyColumns');

//const fk_keyColumnUsage = require('./fk_key_column_usage');
//const fk_referentialConstraints = require('./fk_referential_constraints');
//const fk_tableConstraints = require('./fk_table_constraints');

module.exports = {
  columns,
  tableList,
  primaryKeys,
  foreignKeys,
  views,
  routines,
  parameters,
  matviews,
  indexes,
  triggers,
  //  indexcols,
  uniqueNames,
  //geometryColumns,
  //geographyColumns,
};
