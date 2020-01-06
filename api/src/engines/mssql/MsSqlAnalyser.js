// @ts-check

const fs = require('fs-extra');
const path = require('path');

const DatabaseAnalayser = require('../default/DatabaseAnalyser');

async function loadQuery(name) {
  return await fs.readFile(path.join(__dirname, name), 'utf-8');
}

class MsSqlAnalyser extends DatabaseAnalayser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  async runAnalysis() {
    const tables = this.driver.query(this.pool, await loadQuery('tables.sql'));
  }
}

module.exports = MsSqlAnalyser;
