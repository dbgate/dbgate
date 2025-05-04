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
    const { schemaName, pureName } = this.singleObjectFilter;
    this.singleObjectId = `${schemaName || 'main'}.${pureName}`;
  }

  createQuery(resFileName, typeFields) {
    if (!sql[resFileName]) throw new Error(`Missing analyse file ${resFileName}`);
    return super.createQuery(sql[resFileName], typeFields);
  }

  async _runAnalysis() {
    const tablesResult = await this.analyserQuery('tables', ['tables']);
    const columnsResult = await this.analyserQuery('columns', ['tables']);
    const foreignKeysResult = await this.analyserQuery('foreignKeys', ['tables']);
    const primaryKeysResult = await this.analyserQuery('primaryKeys', ['tables']);
    const uniquesResults = await this.analyserQuery('uniques', ['tables']);
    const indexesResult = await this.analyserQuery('indexes', ['tables']);
    const viewsResult = await this.analyserQuery('views', ['views']);

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
}

module.exports = Analyser;
