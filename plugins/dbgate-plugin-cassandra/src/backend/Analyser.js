const { DatabaseAnalyser } = global.DBGATE_PACKAGES['dbgate-tools'];
const sql = require('./sql');

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
    this.feedback({ analysingMessage: 'Loading tables' });
    const tables = await this.analyserQuery('tables', ['tables']);
    this.feedback({ analysingMessage: 'Loading columns' });
    const columns = await this.analyserQuery('columns', ['tables']);
    // this.feedback({ analysingMessage: 'Loading views' });
    // const views = await this.analyserQuery('views', ['views']);

    const res = {
      tables: tables.rows.map((table) => {
        const tableColumns = columns.rows.filter((col) => col.pureName == table.pureName);
        const pkColumns = tableColumns.filter((i) => i.kind === 'partition_key' || i.kind === 'clustering');

        return {
          ...table,
          primaryKeyColumns: pkColumns,
          columns: tableColumns,
          primaryKey: pkColumns.length ? { columns: pkColumns } : null,
          foreignKeys: [],
        };
      }),
      views: [],
      functions: [],
      triggers: [],
    };
    this.feedback({ analysingMessage: null });
    return res;
  }

  async singleObjectAnalysis(dbhan, typeField) {
    const structure = await this._runAnalysis(dbhan, typeField);
    const item = structure[typeField]?.find((i) => i.pureName === dbhan.pureName);
    return item;
  }

  // async _computeSingleObjectId() {
  //   const { pureName } = this.singleObjectFilter;
  //   const resId = await this.driver.query(
  //     this.dbhan,
  //     `SELECT uuid as id FROM system.tables WHERE database = '${this.dbhan.database}' AND name='${pureName}'`
  //   );
  //   this.singleObjectId = resId.rows[0]?.id;
  // }
}

module.exports = Analyser;
