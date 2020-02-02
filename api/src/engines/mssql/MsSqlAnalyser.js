const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const DatabaseAnalayser = require('../default/DatabaseAnalyser');

/** @returns {Promise<string>} */
async function loadQuery(name) {
  return await fs.readFile(path.join(__dirname, name), 'utf-8');
}

class MsSqlAnalyser extends DatabaseAnalayser {
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
    res = res.replace('=[OBJECT_ID_CONDITION]', ' is not null');
    return res;
  }
  async runAnalysis() {
    const tables = await this.driver.query(this.pool, await this.createQuery('tables.sql'));
    const columns = await this.driver.query(this.pool, await this.createQuery('columns.sql'));

    this.result.tables = tables.rows.map(table => ({
      ...table,
      columns: columns.rows
        .filter(col => col.objectId == table.objectId)
        .map(({ isNullable, isIdentity, ...col }) => ({
          ...col,
          notNull: isNullable != 'True',
          autoIncrement: isIdentity == 'True',
        })),
    }));
  }
}

module.exports = MsSqlAnalyser;
