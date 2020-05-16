const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const DatabaseAnalayser = require('../default/DatabaseAnalyser');

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
          .map(({ isNullable, ...col }) => ({
            ...col,
            notNull: !isNullable,
          })),
        primaryKey: DatabaseAnalayser.extractPrimaryKeys(table, pkColumns.rows),
        foreignKeys: DatabaseAnalayser.extractForeignKeys(table, fkColumns.rows),
      })),
    });
  }
}

module.exports = PostgreAnalyser;
