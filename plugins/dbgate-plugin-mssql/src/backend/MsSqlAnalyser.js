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
    this.singleObjectId = null;
  }

  createQuery(resFileName, typeFields) {
    let res = sql[resFileName];
    if (this.singleObjectFilter) {
      const { typeField } = this.singleObjectFilter;
      if (!this.singleObjectId) return null;
      if (!typeFields || !typeFields.includes(typeField)) return null;
      return res.replace('=[OBJECT_ID_CONDITION]', ` = ${this.singleObjectId}`);
    }
    if (!this.modifications || !typeFields || this.modifications.length == 0) {
      res = res.replace('=[OBJECT_ID_CONDITION]', ' is not null');
    } else {
      const filterIds = this.modifications
        .filter((x) => typeFields.includes(x.objectTypeField) && (x.action == 'add' || x.action == 'change'))
        .map((x) => x.objectId);
      if (filterIds.length == 0) {
        res = res.replace('=[OBJECT_ID_CONDITION]', ' = 0');
      } else {
        res = res.replace('=[OBJECT_ID_CONDITION]', ` in (${filterIds.join(',')})`);
      }
    }
    return res;
  }

  async getSingleObjectId() {
    if (this.singleObjectFilter) {
      const { schemaName, pureName, typeField } = this.singleObjectFilter;
      const fullName = schemaName ? `[${schemaName}].[${pureName}]` : pureName;
      const resId = await this.driver.query(this.pool, `SELECT OBJECT_ID('${fullName}') AS id`);
      this.singleObjectId = resId.rows[0].id;
    }
  }

  async _runAnalysis() {
    await this.getSingleObjectId();
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
    const getCreateSql = (row) =>
      sqlCodeRows.rows
        .filter((x) => x.pureName == row.pureName && x.schemaName == row.schemaName)
        .map((x) => x.codeText)
        .join('');
    const viewsRows = await this.driver.query(this.pool, this.createQuery('views', ['views']));
    const programmableRows = await this.driver.query(
      this.pool,
      this.createQuery('programmables', ['procedures', 'functions'])
    );
    const viewColumnRows = await this.driver.query(this.pool, this.createQuery('viewColumns', ['views']));

    const tables = tablesRows.rows.map((row) => ({
      ...row,
      columns: columnsRows.rows.filter((col) => col.objectId == row.objectId).map(getColumnInfo),
      primaryKey: DatabaseAnalyser.extractPrimaryKeys(row, pkColumnsRows.rows),
      foreignKeys: DatabaseAnalyser.extractForeignKeys(row, fkColumnsRows.rows),
    }));

    const views = viewsRows.rows.map((row) => ({
      ...row,
      createSql: getCreateSql(row),
      columns: viewColumnRows.rows.filter((col) => col.objectId == row.objectId).map(getColumnInfo),
    }));

    const procedures = programmableRows.rows
      .filter((x) => x.sqlObjectType.trim() == 'P')
      .map((row) => ({
        ...row,
        createSql: getCreateSql(row),
      }));

    const functions = programmableRows.rows
      .filter((x) => ['FN', 'IF', 'TF'].includes(x.sqlObjectType.trim()))
      .map((row) => ({
        ...row,
        createSql: getCreateSql(row),
      }));

    return this.mergeAnalyseResult({
      tables,
      views,
      procedures,
      functions,
      schemas,
    });
  }

  getDeletedObjectsForField(idArray, objectTypeField) {
    return this.structure[objectTypeField]
      .filter((x) => !idArray.includes(x.objectId))
      .map((x) => ({
        oldName: _.pick(x, ['schemaName', 'pureName']),
        objectId: x.objectId,
        action: 'remove',
        objectTypeField,
      }));
  }

  getDeletedObjects(idArray) {
    return [
      ...this.getDeletedObjectsForField(idArray, 'tables'),
      ...this.getDeletedObjectsForField(idArray, 'views'),
      ...this.getDeletedObjectsForField(idArray, 'procedures'),
      ...this.getDeletedObjectsForField(idArray, 'functions'),
      ...this.getDeletedObjectsForField(idArray, 'triggers'),
    ];
  }

  async getModifications() {
    const modificationsQueryData = await this.driver.query(this.pool, this.createQuery('modifications'));
    // console.log('MOD - SRC', modifications);
    // console.log(
    //   'MODs',
    //   this.structure.tables.map((x) => x.modifyDate)
    // );
    const modifications = modificationsQueryData.rows.map((x) => {
      const { type, objectId, modifyDate, schemaName, pureName } = x;
      const field = objectTypeToField(type);
      if (!this.structure[field]) return null;
      // @ts-ignore
      const obj = this.structure[field].find((x) => x.objectId == objectId);

      // object not modified
      if (obj && Math.abs(new Date(modifyDate).getTime() - new Date(obj.modifyDate).getTime()) < 1000) return null;

      /** @type {import('dbgate-types').DatabaseModification} */
      const action = obj
        ? {
            newName: { schemaName, pureName },
            oldName: _.pick(obj, ['schemaName', 'pureName']),
            action: 'change',
            objectTypeField: field,
            objectId,
          }
        : {
            newName: { schemaName, pureName },
            action: 'add',
            objectTypeField: field,
            objectId,
          };
      return action;
    });

    return [..._.compact(modifications), ...this.getDeletedObjects(modificationsQueryData.rows.map((x) => x.objectId))];
  }
}

module.exports = MsSqlAnalyser;
