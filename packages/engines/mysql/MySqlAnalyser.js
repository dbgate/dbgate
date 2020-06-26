const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const DatabaseAnalayser = require('../default/DatabaseAnalyser');
const { isTypeString, isTypeNumeric } = require('@dbgate/tools');

function getColumnInfo({
  isNullable,
  extra,
  columnName,
  dataType,
  charMaxLength,
  numericPrecision,
  numericScale,
  defaultValue,
}) {
  let fullDataType = dataType;
  if (charMaxLength && isTypeString(dataType)) fullDataType = `${dataType}(${charMaxLength})`;
  if (numericPrecision && numericScale && isTypeNumeric(dataType))
    fullDataType = `${dataType}(${numericPrecision},${numericScale})`;
  return {
    notNull: !isNullable,
    autoIncrement: extra && extra.toLowerCase().includes('auto_increment'),
    columnName,
    dataType: fullDataType,
    defaultValue,
  };
}

class MySqlAnalyser extends DatabaseAnalayser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  createQuery(resFileName, tables = false, views = false, procedures = false, functions = false, triggers = false) {
    let res = sql[resFileName];
    res = res.replace('=[OBJECT_NAME_CONDITION]', ' is not null');
    res = res.replace('#DATABASE#', this.pool._database_name);
    return res;
  }
  async _runAnalysis() {
    const tables = await this.driver.query(this.pool, this.createQuery('tables'));
    const columns = await this.driver.query(this.pool, this.createQuery('columns'));
    const pkColumns = await this.driver.query(this.pool, this.createQuery('primaryKeys'));
    const fkColumns = await this.driver.query(this.pool, this.createQuery('foreignKeys'));

    return this.mergeAnalyseResult({
      tables: tables.rows.map((table) => ({
        ...table,
        columns: columns.rows.filter((col) => col.pureName == table.pureName).map(getColumnInfo),
        primaryKey: DatabaseAnalayser.extractPrimaryKeys(table, pkColumns.rows),
        foreignKeys: DatabaseAnalayser.extractForeignKeys(table, fkColumns.rows),
      })),
    });
  }
}

module.exports = MySqlAnalyser;
