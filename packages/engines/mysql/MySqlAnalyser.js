const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const DatabaseAnalayser = require('../default/DatabaseAnalyser');

class MySqlAnalyser extends DatabaseAnalayser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  async createQuery(
    resFileName,
    tables = false,
    views = false,
    procedures = false,
    functions = false,
    triggers = false
  ) {
    let res = sql[resFileName];
    res = res.replace('=[OBJECT_NAME_CONDITION]', ' is not null');
    res = res.replace('#DATABASE#', this.pool._database_name);
    return res;
  }
  async runAnalysis() {
    const tables = await this.driver.query(this.pool, await this.createQuery('tables'));
    const columns = await this.driver.query(this.pool, await this.createQuery('columns'));
    //   const pkColumns = await this.driver.query(this.pool, await this.createQuery('primary_keys.sql'));
    //   const fkColumns = await this.driver.query(this.pool, await this.createQuery('foreign_keys.sql'));

    this.result.tables = tables.rows.map(table => ({
      ...table,
      columns: columns.rows
        .filter(col => col.pureName == table.pureName)
        .map(({ isNullable, extra, ...col }) => ({
          ...col,
          notNull: !isNullable,
          autoIncrement: extra && extra.toLowerCase().includes('auto_increment'),
        })),
      foreignKeys: [],
      // primaryKey: extractPrimaryKeys(table, pkColumns.rows),
      // foreignKeys: extractForeignKeys(table, fkColumns.rows),
    }));
  }
}

module.exports = MySqlAnalyser;
