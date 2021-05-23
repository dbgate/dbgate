const _ = require('lodash');
const { DatabaseAnalyser } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  async _runAnalysis() {
    const objects = await this.driver.query(this.pool, "select * from sqlite_master where type='table' or type='view'");
    const tables = objects.rows.filter((x) => x.type == 'table');
    const views = objects.rows.filter((x) => x.type == 'view');
    // console.log('TABLES', tables);

    const tableSqls = _.zipObject(
      tables.map((x) => x.name),
      tables.map((x) => x.sql)
    );

    const tableList = tables.map((x) => ({
      pureName: x.name,
      objectId: x.name,
      contentHash: x.sql,
    }));

    const viewList = views.map((x) => ({
      pureName: x.name,
      objectId: x.name,
      contentHash: x.sql,
      createSql: x.sql,
    }));

    for (const tableName of this.getRequestedObjectPureNames(
      'tables',
      tables.map((x) => x.name)
    )) {
      const tableObj = tableList.find((x) => x.pureName == tableName);
      if (!tableObj) continue;

      const info = await this.driver.query(this.pool, `pragma table_info('${tableName}')`);
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

      const fklist = await this.driver.query(this.pool, `pragma foreign_key_list('${tableName}')`);
      tableObj.foreignKeys = _.values(_.groupBy(fklist.rows, 'id')).map((fkcols) => {
        const fkcol = fkcols[0];
        const fk = {
          pureName: tableName,
          refTableName: fkcol.table,
          columns: fkcols.map((col) => ({
            columnName: col.from,
            refColumnName: col.to,
          })),
          updateAction: fkcol.on_update,
          deleteAction: fkcol.on_delete,
          constraintName: `FK_${tableName}_${fkcol.id}`,
        };
        return fk;
      });

      // console.log(info);
    }

    for (const viewName of this.getRequestedObjectPureNames(
      'views',
      views.map((x) => x.name)
    )) {
      const viewObj = viewList.find((x) => x.pureName == viewName);
      if (!viewObj) continue;

      const info = await this.driver.query(this.pool, `pragma table_info('${viewName}')`);
      viewObj.columns = info.rows.map((col) => ({
        columnName: col.name,
        dataType: col.type,
        notNull: !!col.notnull,
      }));
    }

    return {
      tables: tableList,
      views: viewList,
    };
  }
}

module.exports = Analyser;
