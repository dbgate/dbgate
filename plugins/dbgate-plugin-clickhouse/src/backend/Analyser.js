const { DatabaseAnalyser } = require('dbgate-tools');
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
    res = res.replace('#DATABASE#', this.pool._database_name);
    return super.createQuery(res, typeFields, replacements);
  }

  async _runAnalysis() {
    this.feedback({ analysingMessage: 'Loading tables' });
    const tables = await this.analyserQuery('tables', ['tables']);
    this.feedback({ analysingMessage: 'Loading columns' });
    const columns = await this.analyserQuery('columns', ['tables', 'views']);

    const res = {
      tables: tables.rows.map((table) => ({
        ...table,
        primaryKeyColumns: undefined,
        sortingKeyColumns: undefined,
        columns: columns.rows
          .filter((col) => col.pureName == table.pureName)
          .map((col) => ({
            ...col,
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
    };
    this.feedback({ analysingMessage: null });
    return res;
  }
}

module.exports = Analyser;
