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

    return this.mergeAnalyseResult({
      tables: tables.rows.map(table => ({
        ...table,
        objectId: `tables:${table.schemaName}.${table.pureName}`,
        columns: columns.rows
          .filter(col => col.pureName == table.pureName && col.schemaName == table.schemaName)
          .map(getColumnInfo),
        primaryKey: DatabaseAnalyser.extractPrimaryKeys(table, pkColumns.rows),
        foreignKeys: DatabaseAnalyser.extractForeignKeys(table, fkColumns.rows),
      })),
      views: views.rows.map(view => ({
        ...view,
        objectId: `views:${view.schemaName}.${view.pureName}`,
        columns: columns.rows
          .filter(col => col.pureName == view.pureName && col.schemaName == view.schemaName)
          .map(getColumnInfo),
      })),
      procedures: routines.rows
        .filter(x => x.objectType == 'PROCEDURE')
        .map(proc => ({
          objectId: `procedures:${proc.schemaName}.${proc.pureName}`,
          ...proc,
        })),
      functions: routines.rows
        .filter(x => x.objectType == 'FUNCTION')
        .map(func => ({
          objectId: `functions:${func.schemaName}.${func.pureName}`,
          ...func,
        })),
    });
  }

  async getModifications() {
    const tableModificationsQueryData = await this.driver.query(this.pool, this.createQuery('tableModifications'));
    const viewModificationsQueryData = await this.driver.query(this.pool, this.createQuery('viewModifications'));
    const routineModificationsQueryData = await this.driver.query(this.pool, this.createQuery('routineModifications'));

    const allModifications = _.compact([
      ...tableModificationsQueryData.rows.map(x => ({ ...x, objectTypeField: 'tables' })),
      ...viewModificationsQueryData.rows.map(x => ({ ...x, objectTypeField: 'views' })),
      ...routineModificationsQueryData.rows
        .filter(x => x.objectType == 'PROCEDURE')
        .map(x => ({ ...x, objectTypeField: 'procedures' })),
      ...routineModificationsQueryData.rows
        .filter(x => x.objectType == 'FUNCTION')
        .map(x => ({ ...x, objectTypeField: 'functions' })),
    ]);

    const modifications = allModifications.map(x => {
      const { objectTypeField, hashCode, pureName, schemaName } = x;

      if (!objectTypeField || !this.structure[objectTypeField]) return null;
      const obj = this.structure[objectTypeField].find(x => x.pureName == pureName && x.schemaName == schemaName);

      // object not modified
      if (obj && obj.hashCode == hashCode) return null;

      // console.log('MODIFICATION OF ', objectTypeField, schemaName, pureName);

      /** @type {import('dbgate-types').DatabaseModification} */
      const action = obj
        ? {
            newName: { schemaName, pureName },
            oldName: _.pick(obj, ['schemaName', 'pureName']),
            action: 'change',
            objectTypeField,
            objectId: `${objectTypeField}:${schemaName}.${pureName}`,
          }
        : {
            newName: { schemaName, pureName },
            action: 'add',
            objectTypeField,
            objectId: `${objectTypeField}:${schemaName}.${pureName}`,
          };
      return action;
    });

    return [
      ..._.compact(modifications),
      ...this.getDeletedObjects([...allModifications.map(x => `${x.schemaName}.${x.pureName}`)]),
    ];
  }

  getDeletedObjectsForField(nameArray, objectTypeField) {
    return this.structure[objectTypeField]
      .filter(x => !nameArray.includes(`${x.schemaName}.${x.pureName}`))
      .map(x => ({
        oldName: _.pick(x, ['schemaName', 'pureName']),
        action: 'remove',
        objectTypeField,
        objectId: `${objectTypeField}:${x.schemaName}.${x.pureName}`,
      }));
  }

  getDeletedObjects(nameArray) {
    return [
      ...this.getDeletedObjectsForField(nameArray, 'tables'),
      ...this.getDeletedObjectsForField(nameArray, 'views'),
      ...this.getDeletedObjectsForField(nameArray, 'procedures'),
      ...this.getDeletedObjectsForField(nameArray, 'functions'),
      ...this.getDeletedObjectsForField(nameArray, 'triggers'),
    ];
  }
}

module.exports = Analyser;
