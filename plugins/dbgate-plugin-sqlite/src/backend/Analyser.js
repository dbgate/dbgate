const _ = require('lodash');
const { DatabaseAnalyser } = global.DBGATE_PACKAGES['dbgate-tools'];
const sql = require('./sql');

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
  }

  async _computeSingleObjectId() {
    const { pureName } = this.singleObjectFilter;
    this.singleObjectId = pureName;
  }

  async _getFastSnapshot() {
    const objects = await this.driver.query(this.dbhan, sql.objects);
    const indexcols = await this.driver.query(this.dbhan, sql.indexcols);

    return {
      tables: objects.rows
        .filter((x) => x.type == 'table')
        .map((x) => ({
          pureName: x.name,
          objectId: x.name,
          contentHash: [
            x.sql,
            ...indexcols.rows
              .filter((y) => y.tableName == x.name)
              .map((y) => `-- ${y.constraintName}: ${y.columnName}`),
          ].join(';\n'),
        })),
      views: objects.rows
        .filter((x) => x.type == 'view')
        .map((x) => ({
          pureName: x.name,
          objectId: x.name,
          contentHash: x.sql,
        })),
    };
  }

  async _runAnalysis() {
    const objects = await this.analyserQuery(sql.objectsConditioned, ['tables', 'views']);
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

    const indexcols = await this.driver.query(this.dbhan, sql.indexcols);

    for (const tableName of this.getRequestedObjectPureNames(
      'tables',
      tables.map((x) => x.name)
    )) {
      const tableObj = tableList.find((x) => x.pureName == tableName);
      if (!tableObj) continue;

      const info = await this.driver.query(this.dbhan, `pragma table_info('${tableName}')`);
      tableObj.columns = info.rows.map((col) => ({
        columnName: col.name,
        dataType: col.type,
        notNull: !!col.notnull,
        defaultValue: col.dflt_value == null ? undefined : col.dflt_value,
        autoIncrement: tableSqls[tableName].toLowerCase().includes('autoincrement') && !!col.pk,
      }));

      const indexNames = _.uniq(
        indexcols.rows.filter((x) => x.tableName == tableName && x.origin == 'c').map((x) => x.constraintName)
      );

      tableObj.indexes = indexNames.map((idx) => ({
        constraintName: idx,
        isUnique: !!indexcols.rows.find((x) => x.tableName == tableName && x.constraintName == idx).isUnique,
        columns: indexcols.rows
          .filter((x) => x.tableName == tableName && x.constraintName == idx)
          .map(({ columnName }) => ({ columnName })),
      }));

      const uniqueNames = _.uniq(
        indexcols.rows.filter((x) => x.tableName == tableName && x.origin == 'u').map((x) => x.constraintName)
      );

      tableObj.uniques = uniqueNames.map((idx) => ({
        constraintName: idx,
        columns: indexcols.rows
          .filter((x) => x.tableName == tableName && x.constraintName == idx)
          .map(({ columnName }) => ({ columnName })),
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

      const fklist = await this.driver.query(this.dbhan, `pragma foreign_key_list('${tableName}')`);
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
    }

    for (const viewName of this.getRequestedObjectPureNames(
      'views',
      views.map((x) => x.name)
    )) {
      const viewObj = viewList.find((x) => x.pureName == viewName);
      if (!viewObj) continue;

      const info = await this.driver.query(this.dbhan, `pragma table_info('${viewName}')`);
      viewObj.columns = info.rows.map((col) => ({
        columnName: col.name,
        dataType: col.type,
        notNull: !!col.notnull,
      }));
    }

    const triggers = await this.driver.query(this.dbhan, sql.triggers);

    return {
      tables: tableList,
      views: viewList,
      triggers: triggers.rows,
    };
  }
}

module.exports = Analyser;
