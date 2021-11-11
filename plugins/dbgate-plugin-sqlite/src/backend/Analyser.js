const _ = require('lodash');
const { DatabaseAnalyser } = require('dbgate-tools');

const indexcolsQuery = `
SELECT 
    m.name as tableName,
    il.name as constraintName,
    il."unique" as isUnique,
    ii.name as columnName,
    il.origin
  FROM sqlite_schema AS m,
       pragma_index_list(m.name) AS il,
       pragma_index_info(il.name) AS ii
 WHERE m.type='table' AND il.origin <> 'pk'
 ORDER BY ii.seqno, il.name
  `;

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver, version) {
    super(pool, driver, version);
  }

  async _computeSingleObjectId() {
    const { pureName } = this.singleObjectFilter;
    this.singleObjectId = pureName;
  }

  async _getFastSnapshot() {
    const objects = await this.driver.query(this.pool, "select * from sqlite_master where type='table' or type='view'");
    const indexcols = await this.driver.query(this.pool, indexcolsQuery);

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
    const objects = await this.driver.query(
      this.pool,
      super.createQuery(
        "select * from sqlite_master where (type='table' or type='view') and name =OBJECT_ID_CONDITION",
        ['tables', 'views']
      )
    );
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

    const indexcols = await this.driver.query(this.pool, indexcolsQuery);

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
