const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const { DatabaseAnalyser } = require('dbgate-tools');
const { isTypeString, isTypeNumeric } = require('dbgate-tools');

function getColumnInfo({
  isNullable,
  extra,
  columnName,
  dataType,
  charMaxLength,
  numericPrecision,
  numericScale,
  defaultValue,
  columnComment,
}) {
  let fullDataType = dataType;
  if (charMaxLength && isTypeString(dataType)) fullDataType = `${dataType}(${charMaxLength})`;
  if (numericPrecision && numericScale && isTypeNumeric(dataType))
    fullDataType = `${dataType}(${numericPrecision},${numericScale})`;
  return {
    notNull: !isNullable || isNullable == 'NO' || isNullable == 'no',
    autoIncrement: !!(extra && extra.toLowerCase().includes('auto_increment')),
    columnName,
    columnComment,
    dataType: fullDataType,
    defaultValue,
  };
}

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver, version) {
    super(pool, driver, version);
  }

  createQuery(resFileName, typeFields) {
    let res = sql[resFileName];
    res = res.replace('#DATABASE#', this.pool._database_name);
    return super.createQuery(res, typeFields);
  }

  getRequestedViewNames(allViewNames) {
    return this.getRequestedObjectPureNames('views', allViewNames);
  }

  async _computeSingleObjectId() {
    const { pureName } = this.singleObjectFilter;
    this.singleObjectId = pureName;
  }

  async getViewTexts(allViewNames) {
    const res = {};
    for (const viewName of this.getRequestedViewNames(allViewNames)) {
      try {
        const resp = await this.driver.query(this.pool, `SHOW CREATE VIEW \`${viewName}\``);
        res[viewName] = resp.rows[0]['Create View'];
      } catch (err) {
        console.log('ERROR', err);
        res[viewName] = `${err}`;
      }
    }
    return res;
  }

  async _runAnalysis() {
    const tables = await this.driver.query(this.pool, this.createQuery('tables', ['tables']));
    const columns = await this.driver.query(this.pool, this.createQuery('columns', ['tables', 'views']));
    const pkColumns = await this.safeQuery(this.createQuery('primaryKeys', ['tables']));
    const fkColumns = await this.safeQuery(this.createQuery('foreignKeys', ['tables']));
    const views = await this.safeQuery(this.createQuery('views', ['views']));
    const programmables = await this.safeQuery(this.createQuery('programmables', ['procedures', 'functions']));

    const viewTexts = await this.getViewTexts(views.rows.map(x => x.pureName));
    const indexes = await this.safeQuery(this.createQuery('indexes', ['tables']));
    const uniqueNames = await this.safeQuery(this.createQuery('uniqueNames', ['tables']));

    return {
      tables: tables.rows.map(table => ({
        ...table,
        objectId: table.pureName,
        contentHash: _.isDate(table.modifyDate) ? table.modifyDate.toISOString() : table.modifyDate,
        columns: columns.rows.filter(col => col.pureName == table.pureName).map(getColumnInfo),
        primaryKey: DatabaseAnalyser.extractPrimaryKeys(table, pkColumns.rows),
        foreignKeys: DatabaseAnalyser.extractForeignKeys(table, fkColumns.rows),
        indexes: _.uniqBy(
          indexes.rows.filter(
            idx =>
              idx.tableName == table.pureName && !uniqueNames.rows.find(x => x.constraintName == idx.constraintName)
          ),
          'constraintName'
        ).map(idx => ({
          ..._.pick(idx, ['constraintName', 'indexType']),
          isUnique: !idx.nonUnique,
          columns: indexes.rows
            .filter(col => col.tableName == idx.tableName && col.constraintName == idx.constraintName)
            .map(col => ({
              ..._.pick(col, ['columnName']),
            })),
        })),

        uniques: _.uniqBy(
          indexes.rows.filter(
            idx => idx.tableName == table.pureName && uniqueNames.rows.find(x => x.constraintName == idx.constraintName)
          ),
          'constraintName'
        ).map(idx => ({
          ..._.pick(idx, ['constraintName']),
          columns: indexes.rows
            .filter(col => col.tableName == idx.tableName && col.constraintName == idx.constraintName)
            .map(col => ({
              ..._.pick(col, ['columnName']),
            })),
        })),
      })),
      views: views.rows.map(view => ({
        ...view,
        objectId: view.pureName,
        contentHash: _.isDate(view.modifyDate) ? view.modifyDate.toISOString() : view.modifyDate,
        columns: columns.rows.filter(col => col.pureName == view.pureName).map(getColumnInfo),
        createSql: viewTexts[view.pureName],
        requiresFormat: true,
      })),
      procedures: programmables.rows
        .filter(x => x.objectType == 'PROCEDURE')
        .map(fp.omit(['objectType']))
        .map(x => ({
          ...x,
          objectId: x.pureName,
          contentHash: _.isDate(x.modifyDate) ? x.modifyDate.toISOString() : x.modifyDate,
        })),
      functions: programmables.rows
        .filter(x => x.objectType == 'FUNCTION')
        .map(fp.omit(['objectType']))
        .map(x => ({
          ...x,
          objectId: x.pureName,
          contentHash: _.isDate(x.modifyDate) ? x.modifyDate.toISOString() : x.modifyDate,
        })),
    };
  }

  async _getFastSnapshot() {
    const tableModificationsQueryData = await this.driver.query(this.pool, this.createQuery('tableModifications'));
    const procedureModificationsQueryData = await this.driver.query(
      this.pool,
      this.createQuery('procedureModifications')
    );
    const functionModificationsQueryData = await this.driver.query(
      this.pool,
      this.createQuery('functionModifications')
    );

    return {
      tables: tableModificationsQueryData.rows
        .filter(x => x.objectType == 'BASE TABLE')
        .map(x => ({
          ...x,
          objectId: x.pureName,
          contentHash: _.isDate(x.modifyDate) ? x.modifyDate.toISOString() : x.modifyDate,
        })),
      views: tableModificationsQueryData.rows
        .filter(x => x.objectType == 'VIEW')
        .map(x => ({
          ...x,
          objectId: x.pureName,
          contentHash: _.isDate(x.modifyDate) ? x.modifyDate.toISOString() : x.modifyDate,
        })),
      procedures: procedureModificationsQueryData.rows.map(x => ({
        contentHash: x.Modified,
        objectId: x.Name,
        pureName: x.Name,
      })),
      functions: functionModificationsQueryData.rows.map(x => ({
        contentHash: x.Modified,
        objectId: x.Name,
        pureName: x.Name,
      })),
    };
  }
}

module.exports = Analyser;
