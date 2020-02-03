const fs = require('fs-extra');
const fp = require('lodash/fp');
const path = require('path');
const _ = require('lodash');

const DatabaseAnalayser = require('../default/DatabaseAnalyser');

/** @returns {Promise<string>} */
async function loadQuery(name) {
  return await fs.readFile(path.join(__dirname, name), 'utf-8');
}

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
    let res = await loadQuery(resFileName);
    res = res.replace('=[OBJECT_NAME_CONDITION]', ' is not null');
    res = res.replace('#DATABASE#', this.pool._database_name);
    return res;
  }
  async runAnalysis() {
    const tables = await this.driver.query(this.pool, await this.createQuery('tables.sql'));
    const columns = await this.driver.query(this.pool, await this.createQuery('columns.sql'));
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
