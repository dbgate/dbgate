const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const { DatabaseAnalyser, isTypeString, isTypeNumeric } = global.DBGATE_PACKAGES['dbgate-tools'];

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

function simplifyComutedExpression(expr) {
  if (expr) {
    while (expr.startsWith('(') && expr.endsWith(')')) {
      expr = expr.slice(1, -1);
    }
  }
  return expr;
}

function getColumnInfo({
  isNullable,
  isIdentity,
  columnName,
  dataType,
  charMaxLength,
  numericPrecision,
  numericScale,
  defaultValue,
  defaultConstraint,
  computedExpression,
}) {
  let fullDataType = dataType;
  if (charMaxLength && isTypeString(dataType)) {
    fullDataType = `${dataType}(${charMaxLength < 0 ? 'MAX' : charMaxLength})`;
  }
  if (numericPrecision && numericScale && isTypeNumeric(dataType)) {
    fullDataType = `${dataType}(${numericPrecision},${numericScale})`;
  }
  return {
    columnName,
    dataType: fullDataType,
    notNull: !isNullable,
    autoIncrement: !!isIdentity,
    defaultValue,
    defaultConstraint,
    computedExpression: simplifyComutedExpression(computedExpression),
  };
}

class MsSqlAnalyser extends DatabaseAnalyser {
  constructor(pool, driver, version) {
    super(pool, driver, version);
  }

  createQuery(resFileName, typeFields) {
    if (!sql[resFileName]) throw new Error(`Missing analyse file ${resFileName}`);
    return super.createQuery(sql[resFileName], typeFields);
  }

  async _computeSingleObjectId() {
    const { schemaName, pureName, typeField } = this.singleObjectFilter;
    const fullName = schemaName ? `[${schemaName}].[${pureName}]` : pureName;
    const resId = await this.driver.query(this.pool, `SELECT OBJECT_ID('${fullName}') AS id`);
    this.singleObjectId = resId.rows[0].id;
  }

  async _runAnalysis() {
    this.feedback({ analysingMessage: 'Loading tables' });
    const tablesRows = await this.analyserQuery('tables', ['tables']);
    this.feedback({ analysingMessage: 'Loading columns' });
    const columnsRows = await this.analyserQuery('columns', ['tables']);
    this.feedback({ analysingMessage: 'Loading primary keys' });
    const pkColumnsRows = await this.analyserQuery('primaryKeys', ['tables']);
    this.feedback({ analysingMessage: 'Loading foreign keys' });
    const fkColumnsRows = await this.analyserQuery('foreignKeys', ['tables']);
    this.feedback({ analysingMessage: 'Loading indexes' });
    const indexesRows = await this.analyserQuery('indexes', ['tables']);
    this.feedback({ analysingMessage: 'Loading index columns' });
    const indexcolsRows = await this.analyserQuery('indexcols', ['tables']);
    this.feedback({ analysingMessage: 'Loading default schema' });
    const defaultSchemaRows = await this.driver.query(this.pool, 'SELECT SCHEMA_NAME() as name');
    this.feedback({ analysingMessage: 'Loading table sizes' });
    const tableSizes = await this.analyserQuery('tableSizes');

    const tableSizesDict = _.mapValues(_.keyBy(tableSizes.rows, 'objectId'), 'tableRowCount');

    this.feedback({ analysingMessage: 'Loading SQL code' });
    const sqlCodeRows = await this.analyserQuery('loadSqlCode', ['views', 'procedures', 'functions', 'triggers']);
    const getCreateSql = row =>
      sqlCodeRows.rows
        .filter(x => x.pureName == row.pureName && x.schemaName == row.schemaName)
        .map(x => x.codeText)
        .join('');

    this.feedback({ analysingMessage: 'Loading views' });
    const viewsRows = await this.analyserQuery('views', ['views']);
    this.feedback({ analysingMessage: 'Loading procedures & functions' });
    const programmableRows = await this.analyserQuery('programmables', ['procedures', 'functions']);
    this.feedback({ analysingMessage: 'Loading view columns' });
    const viewColumnRows = await this.analyserQuery('viewColumns', ['views']);

    this.feedback({ analysingMessage: 'Finalizing DB structure' });
    const tables = tablesRows.rows.map(row => ({
      ...row,
      contentHash: row.modifyDate && row.modifyDate.toISOString(),
      columns: columnsRows.rows.filter(col => col.objectId == row.objectId).map(getColumnInfo),
      primaryKey: DatabaseAnalyser.extractPrimaryKeys(row, pkColumnsRows.rows),
      foreignKeys: DatabaseAnalyser.extractForeignKeys(row, fkColumnsRows.rows),
      indexes: indexesRows.rows
        .filter(idx => idx.object_id == row.objectId && !idx.is_unique_constraint)
        .map(idx => ({
          ..._.pick(idx, ['constraintName', 'indexType', 'isUnique']),
          columns: indexcolsRows.rows
            .filter(col => col.object_id == idx.object_id && col.index_id == idx.index_id)
            .map(col => ({
              ..._.pick(col, ['columnName', 'isDescending', 'isIncludedColumn']),
            })),
        })),
      uniques: indexesRows.rows
        .filter(idx => idx.object_id == row.objectId && idx.is_unique_constraint)
        .map(idx => ({
          ..._.pick(idx, ['constraintName']),
          columns: indexcolsRows.rows
            .filter(col => col.object_id == idx.object_id && col.index_id == idx.index_id)
            .map(col => ({
              ..._.pick(col, ['columnName']),
            })),
        })),
      tableRowCount: tableSizesDict[row.objectId],
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

    this.feedback({ analysingMessage: null });
    return {
      tables,
      views,
      procedures,
      functions,
      defaultSchema: defaultSchemaRows.rows[0] ? defaultSchemaRows.rows[0].name : undefined,
    };
  }

  async _getFastSnapshot() {
    const modificationsQueryData = await this.analyserQuery('modifications');
    const tableSizes = await this.analyserQuery('tableSizes');

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

    for (const tableSize of tableSizes.rows) {
      const table = (res.tables || []).find(x => x.objectId == tableSize.objectId);
      if (table) {
        table.tableRowCount = tableSize.tableRowCount;
      }
    }
    return res;
  }
}

module.exports = MsSqlAnalyser;
