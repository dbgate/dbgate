const _ = require('lodash');
const { DatabaseAnalyser } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  async _runAnalysis() {
    const tables = await this.driver.query(this.pool, "select * from sqlite_master where type='table'");
    console.log('TABLES', tables);

    const tableSqls = _.zipObject(
      tables.rows.map((x) => x.name),
      tables.rows.map((x) => x.sql)
    );

    const tableList = tables.rows.map((x) => ({
      pureName: x.name,
      objectId: x.name,
    }));

    for (const tableName of this.getRequestedObjectPureNames(
      'tables',
      tables.rows.map((x) => x.name)
    )) {
      const info = await this.driver.query(this.pool, `pragma table_info('${tableName}')`);
      const tableObj = tableList.find((x) => x.pureName == tableName);
      tableObj.columns = info.rows.map((col) => ({
        columnName: col.name,
        dataType: col.type,
        notNull: !!col.notnull,
        defaultValue: col.dflt_value == null ? undefined : col.dflt_value,
        autoIncrement: tableSqls[tableName].toLowerCase().includes('autoincrement') && !!col.pk,
      }));

      const pkColumns = info.rows
        .filter((x) => x.pk)
        .map((col) => ({
          columnName: col.name,
        }));

      if (pkColumns.length > 0) {
        tableObj.primaryKey = {
          columns: pkColumns,
        };
      }

      // console.log(info);
    }

    const res = this.mergeAnalyseResult(
      {
        tables: tableList,
      },
      (x) => x.pureName
    );
    // console.log('MERGED', res);
    return res;
  }
}

module.exports = Analyser;
