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
    notNull: !isNullable,
    autoIncrement: !!isIdentity,
    defaultValue,
  };
}

class PostgreAnalyser extends DatabaseAnalayser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  createQuery(resFileName, tables = false, views = false, procedures = false, functions = false, triggers = false) {
    let res = sql[resFileName];
    res = res.replace('=[OBJECT_ID_CONDITION]', ' is not null');
    return res;
  }
  async _runAnalysis() {
    const tables = await this.driver.query(this.pool, this.createQuery('tableModifications'));
    const columns = await this.driver.query(this.pool, this.createQuery('columns'));
    const pkColumns = await this.driver.query(this.pool, this.createQuery('primaryKeys'));
    const fkColumns = await this.driver.query(this.pool, this.createQuery('foreignKeys'));
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
    });
  }
}

module.exports = PostgreAnalyser;
