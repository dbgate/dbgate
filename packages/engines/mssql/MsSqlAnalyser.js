const fs = require('fs-extra');
const fp = require('lodash/fp');
const path = require('path');
const _ = require('lodash');

const DatabaseAnalayser = require('../default/DatabaseAnalyser');

/** @returns {Promise<string>} */
async function loadQuery(name) {
  return await fs.readFile(path.join(__dirname, name), 'utf-8');
}

const byTableFilter = table => x => x.pureName == table.pureName && x.schemaName == x.schemaName;

function extractPrimaryKeys(table, pkColumns) {
  const filtered = pkColumns.filter(byTableFilter(table));
  if (filtered.length == 0) return undefined;
  return {
    ..._.pick(filtered[0], ['constraintName', 'schemaName', 'pureName']),
    constraintType: 'primaryKey',
    columns: filtered.map(fp.pick('columnName')),
  };
}

function extractForeignKeys(table, fkColumns) {
  const grouped = _.groupBy(fkColumns.filter(byTableFilter(table)), 'constraintName');
  return _.keys(grouped).map(constraintName => ({
    constraintName,
    constraintType: 'foreignKey',
    ..._.pick(grouped[constraintName][0], [
      'constraintName',
      'schemaName',
      'pureName',
      'refSchemaName',
      'refTableName',
      'updateAction',
      'deleteAction',
    ]),
    columns: grouped[constraintName].map(fp.pick(['columnName', 'refColumnName'])),
  }));
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
    const pkColumns = await this.driver.query(this.pool, await this.createQuery('primary_keys.sql'));
    const fkColumns = await this.driver.query(this.pool, await this.createQuery('foreign_keys.sql'));

    this.result.tables = tables.rows.map(table => ({
      ...table,
      columns: columns.rows
        .filter(col => col.objectId == table.objectId)
        .map(({ isNullable, isIdentity, ...col }) => ({
          ...col,
          notNull: !isNullable,
          autoIncrement: !!isIdentity,
        })),
      primaryKey: extractPrimaryKeys(table, pkColumns.rows),
      foreignKeys: extractForeignKeys(table, fkColumns.rows),
    }));
  }
}

module.exports = MsSqlAnalyser;
