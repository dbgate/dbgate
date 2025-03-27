const _ = require('lodash');
const { DatabaseAnalyser } = require('dbgate-tools');
const sql = require('./sql');
const {
  mapRawTableToTableInfo,
  mapRawColumnToColumnInfo,
  mapDuckDbFkConstraintToForeignKeyInfo,
} = require('./Analyser.helpers');

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
  }

  async _computeSingleObjectId() {
    const { pureName } = this.singleObjectFilter;
    this.singleObjectId = pureName;
  }

  async _getFastSnapshot() {
    const tablesResult = await this.driver.query(this.dbhan, sql.tables);
    const columnsResult = await this.driver.query(this.dbhan, sql.columns);
    const foreignKeysResult = await this.driver.query(this.dbhan, sql.foreignKeys);

    /**
     * @type {import('dbgate-types').ForeignKeyInfo[]}
     */
    const foreignKeys = foreignKeysResult.rows.map(mapDuckDbFkConstraintToForeignKeyInfo).filter(Boolean);
    const columns = columnsResult.rows.map(mapRawColumnToColumnInfo);
    const tables = tablesResult.rows.map(mapRawTableToTableInfo);
    const tablesExtended = tables.map((table) => ({
      ...table,
      columns: columns.filter((x) => x.pureName == table.pureName && x.schemaName == table.schemaName),
      foreignKeys: foreignKeys.filter((x) => x.pureName == table.pureName && x.schemaName == table.schemaName),
    }));

    return {
      tables: tablesExtended,
    };
  }

  async _runAnalysis() {
    const structure = await this._getFastSnapshot();
    return structure;
    throw new Error('Not implemented');
    return this._getFastSnapshot();
  }
}

module.exports = Analyser;
