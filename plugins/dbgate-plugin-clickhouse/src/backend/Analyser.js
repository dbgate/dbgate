const { DatabaseAnalyser } = global.DBGATE_PACKAGES['dbgate-tools'];
const sql = require('./sql');

function extractDataType(dataType) {
  if (!dataType) return {};
  if (dataType.startsWith('Nullable(')) {
    const displayedDataType = dataType.substring('Nullable('.length, dataType.length - 1);
    return {
      dataType,
      displayedDataType,
      notNull: false,
    };
  }
  return {
    dataType,
    notNull: true,
  };
}

class Analyser extends DatabaseAnalyser {
  constructor(connection, driver) {
    super(connection, driver);
  }

  createQuery(resFileName, typeFields, replacements = {}) {
    let res = sql[resFileName];
    res = res.replace('#DATABASE#', this.dbhan.database);
    return super.createQuery(res, typeFields, replacements);
  }

  async _runAnalysis() {
    this.feedback({ analysingMessage: 'DBGM-00181 Loading tables' });
    const tables = await this.analyserQuery('tables', ['tables']);
    this.feedback({ analysingMessage: 'DBGM-00182 Loading columns' });
    const columns = await this.analyserQuery('columns', ['tables', 'views']);
    this.feedback({ analysingMessage: 'DBGM-00183 Loading views' });
    let views = await this.analyserQuery('views', ['views']);
    if (views?.isError) {
      views = await this.analyserQuery('viewsNoDefinition', ['views']);
    }

    const res = {
      tables: tables.rows.map((table) => ({
        ...table,
        primaryKeyColumns: undefined,
        sortingKeyColumns: undefined,
        columns: columns.rows
          .filter((col) => col.pureName == table.pureName)
          .map((col) => ({
            ...col,
            defaultValue: col.defaultValue ? col.defaultValue : undefined,
            ...extractDataType(col.dataType),
          })),
        primaryKey: table.primaryKeyColumns
          ? { columns: (table.primaryKeyColumns || '').split(',').map((x) => ({ columnName: x.trim() })) }
          : null,
        sortingKey: table.sortingKeyColumns
          ? { columns: (table.sortingKeyColumns || '').split(',').map((x) => ({ columnName: x.trim() })) }
          : null,
        foreignKeys: [],
      })),
      views: views.rows.map((view) => ({
        ...view,
        columns: columns.rows
          .filter((col) => col.pureName == view.pureName)
          .map((col) => ({
            ...col,
            ...extractDataType(col.dataType),
          })),
        createSql: view.viewDefinition ? `CREATE VIEW "${view.pureName}"\nAS\n${view.viewDefinition}` : '',
      })),
    };
    this.feedback({ analysingMessage: null });
    return res;
  }

  async _getFastSnapshot() {
    const tableModificationsQueryData = await this.analyserQuery('tableModifications');

    return {
      tables: tableModificationsQueryData.rows.filter((x) => x.tableEngine != 'View'),
      views: tableModificationsQueryData.rows.filter((x) => x.tableEngine == 'View'),
    };
  }

  async _computeSingleObjectId() {
    const { pureName } = this.singleObjectFilter;
    const resId = await this.driver.query(
      this.dbhan,
      `SELECT uuid as id FROM system.tables WHERE database = '${this.dbhan.database}' AND name='${pureName}'`
    );
    this.singleObjectId = resId.rows[0]?.id;
  }
}

module.exports = Analyser;
