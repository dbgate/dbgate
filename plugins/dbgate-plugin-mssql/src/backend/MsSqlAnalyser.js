const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const { DatabaseAnalyser } = require('dbgate-tools');
const { isTypeString, isTypeNumeric } = require('dbgate-tools');

function objectTypeToField(type) {
  switch (type.trim()) {
    case 'U':
      return 'tables';
    case 'V':
      return 'views';
    case 'P':
      return 'procedures';
    case 'IF':
    case 'FN':
    case 'TF':
      return 'functions';
    case 'TR':
      return 'triggers';
    default:
      return null;
  }
}

function getColumnInfo({
  isNullable,
  isIdentity,
  columnName,
  dataType,
  charMaxLength,
  numericPrecision,
  numericScale,
}) {
  let fullDataType = dataType;
  if (charMaxLength && isTypeString(dataType)) fullDataType = `${dataType}(${charMaxLength})`;
  if (numericPrecision && numericScale && isTypeNumeric(dataType))
    fullDataType = `${dataType}(${numericPrecision},${numericScale})`;
  return {
    columnName,
    dataType: fullDataType,
    notNull: !isNullable,
    autoIncrement: !!isIdentity,
  };
}

class MsSqlAnalyser extends DatabaseAnalyser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  createQuery(resFileName, typeFields) {
    return super.createQuery(sql[resFileName], typeFields);
  }

  async _computeSingleObjectId() {
    const { schemaName, pureName, typeField } = this.singleObjectFilter;
    const fullName = schemaName ? `[${schemaName}].[${pureName}]` : pureName;
    const resId = await this.driver.query(this.pool, `SELECT OBJECT_ID('${fullName}') AS id`);
    this.singleObjectId = resId.rows[0].id;
  }

  async _runAnalysis() {
    const tablesRows = await this.driver.query(this.pool, this.createQuery('tables', ['tables']));
    const columnsRows = await this.driver.query(this.pool, this.createQuery('columns', ['tables']));
    const pkColumnsRows = await this.driver.query(this.pool, this.createQuery('primaryKeys', ['tables']));
    const fkColumnsRows = await this.driver.query(this.pool, this.createQuery('foreignKeys', ['tables']));
    const schemaRows = await this.driver.query(this.pool, this.createQuery('getSchemas'));

    const schemas = schemaRows.rows;

    const sqlCodeRows = await this.driver.query(
      this.pool,
      this.createQuery('loadSqlCode', ['views', 'procedures', 'functions', 'triggers'])
    );
    const getCreateSql = row =>
      sqlCodeRows.rows
        .filter(x => x.pureName == row.pureName && x.schemaName == row.schemaName)
        .map(x => x.codeText)
        .join('');
    const viewsRows = await this.driver.query(this.pool, this.createQuery('views', ['views']));
    const programmableRows = await this.driver.query(
      this.pool,
      this.createQuery('programmables', ['procedures', 'functions'])
    );
    const viewColumnRows = await this.driver.query(this.pool, this.createQuery('viewColumns', ['views']));

    const tables = tablesRows.rows.map(row => ({
      ...row,
      contentHash: row.modifyDate && row.modifyDate.toISOString(),
      columns: columnsRows.rows.filter(col => col.objectId == row.objectId).map(getColumnInfo),
      primaryKey: DatabaseAnalyser.extractPrimaryKeys(row, pkColumnsRows.rows),
      foreignKeys: DatabaseAnalyser.extractForeignKeys(row, fkColumnsRows.rows),
    }));

    const views = viewsRows.rows.map(row => ({
      ...row,
      contentHash: row.modifyDate && row.modifyDate.toISOString(),
      createSql: getCreateSql(row),
      columns: viewColumnRows.rows.filter(col => col.objectId == row.objectId).map(getColumnInfo),
    }));

    const procedures = programmableRows.rows
      .filter(x => x.sqlObjectType.trim() == 'P')
      .map(row => ({
        ...row,
        contentHash: row.modifyDate && row.modifyDate.toISOString(),
        createSql: getCreateSql(row),
      }));

    const functions = programmableRows.rows
      .filter(x => ['FN', 'IF', 'TF'].includes(x.sqlObjectType.trim()))
      .map(row => ({
        ...row,
        contentHash: row.modifyDate && row.modifyDate.toISOString(),
        createSql: getCreateSql(row),
      }));

    return {
      tables,
      views,
      procedures,
      functions,
      schemas,
    };
  }

  async _getFastSnapshot() {
    const modificationsQueryData = await this.driver.query(this.pool, this.createQuery('modifications'));

    const res = DatabaseAnalyser.createEmptyStructure();
    for (const item of modificationsQueryData.rows) {
      const { type, objectId, modifyDate, schemaName, pureName } = item;
      const field = objectTypeToField(type);
      if (!field || !res[field]) continue;

      res[field].push({
        objectId,
        contentHash: modifyDate && modifyDate.toISOString(),
        schemaName,
        pureName,
      });
    }
    return res;
  }
}

module.exports = MsSqlAnalyser;
