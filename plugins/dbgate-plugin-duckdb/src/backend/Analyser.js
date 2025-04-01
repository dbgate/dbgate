const _ = require('lodash');
const { DatabaseAnalyser } = require('dbgate-tools');
const sql = require('./sql');
const {
  mapRawTableToTableInfo,
  mapRawColumnToColumnInfo,
  mapConstraintRowToForeignKeyInfo: mapDuckDbFkConstraintToForeignKeyInfo,
  mapConstraintRowToPrimaryKeyInfo,
  mapIndexRowToIndexInfo,
  mapConstraintRowToUniqueInfo,
  mapViewRowToViewInfo,
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
    const primaryKeysResult = await this.driver.query(this.dbhan, sql.primaryKeys);
    const uniquesResults = await this.driver.query(this.dbhan, sql.uniques);
    const indexesResult = await this.driver.query(this.dbhan, sql.indexes);
    const viewsResult = await this.driver.query(this.dbhan, sql.views);

    /**
     * @type {import('dbgate-types').ForeignKeyInfo[]}
     */
    const foreignKeys = foreignKeysResult.rows?.map(mapDuckDbFkConstraintToForeignKeyInfo).filter(Boolean);

    /**
     * @type {import('dbgate-types').PrimaryKeyInfo[]}
     */
    const primaryKeys = primaryKeysResult.rows?.map(mapConstraintRowToPrimaryKeyInfo).filter(Boolean);

    /**
     * @type {import('dbgate-types').UniqueInfo[]}
     */
    const uniques = uniquesResults.rows?.map(mapConstraintRowToUniqueInfo).filter(Boolean);

    /**
     * @type {import('dbgate-types').IndexInfo[]}
     */
    const indexes = indexesResult.rows?.map(mapIndexRowToIndexInfo).filter(Boolean);

    const views = viewsResult.rows?.map(mapViewRowToViewInfo);

    const columns = columnsResult.rows?.map(mapRawColumnToColumnInfo);
    const tables = tablesResult.rows?.map(mapRawTableToTableInfo);
    const tablesExtended = tables.map((table) => ({
      ...table,
      columns: columns.filter((x) => x.pureName == table.pureName && x.schemaName == table.schemaName),
      foreignKeys: foreignKeys.filter((x) => x.pureName == table.pureName && x.schemaName == table.schemaName),
      primaryKey: primaryKeys.find((x) => x.pureName == table.pureName && x.schemaName == table.schemaName),
      indexes: indexes.filter((x) => x.pureName == table.pureName && x.schemaName == table.schemaName),
      uniques: uniques.filter((x) => x.pureName == table.pureName && x.schemaName == table.schemaName),
    }));

    const viewsExtended = views.map((view) => ({
      ...view,
      columns: columns.filter((x) => x.pureName == view.pureName && x.schemaName == view.schemaName),
    }));

    return {
      tables: tablesExtended,
      views: viewsExtended,
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
