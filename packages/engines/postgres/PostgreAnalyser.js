const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const DatabaseAnalayser = require('../default/DatabaseAnalyser');
const { isTypeString, isTypeNumeric } = require('@dbgate/tools');

function normalizeTypeName(dataType) {
  if (dataType == 'character varying') return 'varchar';
  if (dataType == 'timestamp without time zone') return 'timestamp';
  return dataType;
}

function getColumnInfo({
  isNullable,
  isIdentity,
  columnName,
  dataType,
  charMaxLength,
  numericPrecision,
  numericScale,
  defaultValue,
}) {
  const normDataType = normalizeTypeName(dataType);
  let fullDataType = normDataType;
  if (charMaxLength && isTypeString(normDataType)) fullDataType = `${normDataType}(${charMaxLength})`;
  if (numericPrecision && numericScale && isTypeNumeric(normDataType))
    fullDataType = `${normDataType}(${numericPrecision},${numericScale})`;
  return {
    columnName,
    dataType: fullDataType,
    notNull: !isNullable || isNullable == 'NO' || isNullable == 'no',
    autoIncrement: !!isIdentity,
    defaultValue,
  };
}

class PostgreAnalyser extends DatabaseAnalayser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  createQuery(resFileName, typeFields) {
    let res = sql[resFileName];
    res = res.replace('=[OBJECT_ID_CONDITION]', ' is not null');
    return res;
  }
  async _runAnalysis() {
    const tables = await this.driver.query(this.pool, this.createQuery('tableModifications', ['tables']));
    const columns = await this.driver.query(this.pool, this.createQuery('columns', ['tables']));
    const pkColumns = await this.driver.query(this.pool, this.createQuery('primaryKeys', ['tables']));
    const fkColumns = await this.driver.query(this.pool, this.createQuery('foreignKeys', ['tables']));
    const views = await this.driver.query(this.pool, this.createQuery('views', ['views']));
    const routines = await this.driver.query(this.pool, this.createQuery('routines', ['procedures', 'functions']));
    // console.log('PG fkColumns', fkColumns.rows);

    return this.mergeAnalyseResult({
      tables: tables.rows.map((table) => ({
        ...table,
        columns: columns.rows
          .filter((col) => col.pureName == table.pureName && col.schemaName == table.schemaName)
          .map(getColumnInfo),
        primaryKey: DatabaseAnalayser.extractPrimaryKeys(table, pkColumns.rows),
        foreignKeys: DatabaseAnalayser.extractForeignKeys(table, fkColumns.rows),
      })),
      views: views.rows.map((view) => ({
        ...view,
        columns: columns.rows
          .filter((col) => col.pureName == view.pureName && col.schemaName == view.schemaName)
          .map(getColumnInfo),
      })),
      procedures: routines.rows.filter((x) => x.objectType == 'PROCEDURE'),
      functions: routines.rows.filter((x) => x.objectType == 'FUNCTION'),
    });
  }
}

module.exports = PostgreAnalyser;
