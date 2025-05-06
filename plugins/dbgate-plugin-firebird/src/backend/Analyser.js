const _ = require('lodash');
const sql = require('./sql');
const { getDataTypeString } = require('./helpers');

const { DatabaseAnalyser } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
  }

  async _runAnalysis() {
    const tablesResult = await this.driver.query(this.dbhan, sql.tables);
    const columnsResult = await this.driver.query(this.dbhan, sql.columns);

    const columns = columnsResult.rows.map(i => ({
      tableName: i.TABLENAME,
      columnName: i.COLUMNNAME,
      notNull: i.NOTNULL,
      isPrimaryKey: i.ISPRIMARYKEY,
      dataType: getDataTypeString(i),
      precision: i.NUMBERPRECISION,
      scale: i.SCALE,
      length: i.LENGTH,
      defaultValue: i.DEFAULTVALUE,
      columnComment: i.COLUMNCOMMENT,
      isUnsigned: i.ISUNSIGNED,
      pureName: i.PURENAME,
      schemaName: i.SCHEMANAME,
    }));
    const tables = tablesResult.rows.map(i => ({
      pureName: i.PURENAME,
      objectId: i.OBJECTID,
      schemaName: i.SCHEMANAME,
      objectComment: i.OBJECTCOMMENT,
    }));

    return {
      tables: tables.map(table => ({
        ...table,
        columns: columns.filter(
          column => column.tableName === table.pureName && column.schemaName === table.schemaName
        ),
      })),
    };
  }

  async _getFastSnapshot() {
    return this._runAnalysis();
  }
}

module.exports = Analyser;
