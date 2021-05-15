const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const { DatabaseAnalyser } = require('dbgate-tools');
const { isTypeString, isTypeNumeric } = require('dbgate-tools');

function normalizeTypeName(dataType) {
  if (dataType == 'character varying') return 'varchar';
  if (dataType == 'timestamp without time zone') return 'timestamp';
  return dataType;
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
}) {
  const normDataType = normalizeTypeName(dataType);
  let fullDataType = normDataType;
  if (charMaxLength && isTypeString(normDataType)) fullDataType = `${normDataType}(${charMaxLength})`;
  if (numericPrecision && numericScale && isTypeNumeric(normDataType))
    fullDataType = `${normDataType}(${numericPrecision},${numericScale})`;
  return {
    columnName,
    dataType: fullDataType,
    notNull: !isNullable || isNullable == 'NO' || isNullable == 'no',
    autoIncrement: !!isIdentity,
    defaultValue,
  };
}

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  createQuery(resFileName, typeFields) {
    return super.createQuery(sql[resFileName], typeFields);
  }

  async _computeSingleObjectId() {
    const { typeField, schemaName, pureName } = this.singleObjectFilter;
    this.singleObjectId = `${typeField}:${schemaName || 'public'}.${pureName}`;
  }

  async _runAnalysis() {
    const tables = await this.driver.query(this.pool, this.createQuery('tableModifications', ['tables']));
    const columns = await this.driver.query(this.pool, this.createQuery('columns', ['tables']));
    const pkColumns = await this.driver.query(this.pool, this.createQuery('primaryKeys', ['tables']));
    const fkColumns = await this.driver.query(this.pool, this.createQuery('foreignKeys', ['tables']));
    const views = await this.driver.query(this.pool, this.createQuery('views', ['views']));
    const routines = await this.driver.query(this.pool, this.createQuery('routines', ['procedures', 'functions']));
    // console.log('PG fkColumns', fkColumns.rows);

    return {
      tables: tables.rows.map(table => ({
        ...table,
        objectId: `tables:${table.schemaName}.${table.pureName}`,
        contentHash: `${table.hashCodeColumns}-${table.hashCodeConstraints}`,
        columns: columns.rows
          .filter(col => col.pureName == table.pureName && col.schemaName == table.schemaName)
          .map(getColumnInfo),
        primaryKey: DatabaseAnalyser.extractPrimaryKeys(table, pkColumns.rows),
        foreignKeys: DatabaseAnalyser.extractForeignKeys(table, fkColumns.rows),
      })),
      views: views.rows.map(view => ({
        ...view,
        objectId: `views:${view.schemaName}.${view.pureName}`,
        contentHash: view.hashCode,
        columns: columns.rows
          .filter(col => col.pureName == view.pureName && col.schemaName == view.schemaName)
          .map(getColumnInfo),
      })),
      procedures: routines.rows
        .filter(x => x.objectType == 'PROCEDURE')
        .map(proc => ({
          objectId: `procedures:${proc.schemaName}.${proc.pureName}`,
          contentHash: proc.hashCode,
          ...proc,
        })),
      functions: routines.rows
        .filter(x => x.objectType == 'FUNCTION')
        .map(func => ({
          objectId: `functions:${func.schemaName}.${func.pureName}`,
          contentHash: func.hashCode,
          ...func,
        })),
    };
  }

  async _getFastSnapshot() {
    const tableModificationsQueryData = await this.driver.query(this.pool, this.createQuery('tableModifications'));
    const viewModificationsQueryData = await this.driver.query(this.pool, this.createQuery('viewModifications'));
    const routineModificationsQueryData = await this.driver.query(this.pool, this.createQuery('routineModifications'));

    return {
      tables: tableModificationsQueryData.rows.map(x => ({
        ...x,
        objectId: `tables:${x.schemaName}.${x.pureName}`,
        contentHash: `${x.hashCodeColumns}-${x.hashCodeConstraints}`,
      })),
      views: viewModificationsQueryData.rows.map(x => ({
        ...x,
        objectId: `views:${x.schemaName}.${x.pureName}`,
        contentHash: x.hashCode,
      })),
      procedures: routineModificationsQueryData.rows
        .filter(x => x.objectType == 'PROCEDURE')
        .map(x => ({
          ...x,
          objectId: `procedures:${x.schemaName}.${x.pureName}`,
          contentHash: x.hashCode,
        })),
      functions: routineModificationsQueryData.rows
        .filter(x => x.objectType == 'FUNCTION')
        .map(x => ({
          ...x,
          objectId: `functions:${x.schemaName}.${x.pureName}`,
          contentHash: x.hashCode,
        })),
    };
  }
}

module.exports = Analyser;
