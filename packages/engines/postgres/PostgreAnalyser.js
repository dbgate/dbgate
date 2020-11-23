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

class PostgreAnalyser extends DatabaseAnalyser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  createQuery(resFileName, typeFields) {
    let res = sql[resFileName];

    if (this.singleObjectFilter) {
      const { typeField, schemaName, pureName } = this.singleObjectFilter;
      if (!typeFields || !typeFields.includes(typeField)) return null;
      res = res.replace(/=OBJECT_ID_CONDITION/g, ` = '${typeField}:${schemaName || 'public'}.${pureName}'`);
      return res;
    }
    if (!this.modifications || !typeFields || this.modifications.length == 0) {
      res = res.replace(/=OBJECT_ID_CONDITION/g, ' is not null');
    } else {
      const filterNames = this.modifications
        .filter((x) => typeFields.includes(x.objectTypeField) && (x.action == 'add' || x.action == 'change'))
        .filter((x) => x.newName)
        .map((x) => `${x.objectTypeField}:${x.newName.schemaName}.${x.newName.pureName}`);
      if (filterNames.length == 0) {
        res = res.replace(/=OBJECT_ID_CONDITION/g, ' IS NULL');
      } else {
        res = res.replace(/=OBJECT_ID_CONDITION/g, ` in (${filterNames.map((x) => `'${x}'`).join(',')})`);
      }
    }
    return res;

    // let res = sql[resFileName];
    // res = res.replace('=[OBJECT_ID_CONDITION]', ' is not null');
    // return res;
  }
  async _runAnalysis() {
    const tables = await this.driver.query(this.pool, this.createQuery('tableModifications', ['tables']));
    const columns = await this.driver.query(this.pool, this.createQuery('columns', ['tables']));
    const pkColumns = await this.driver.query(this.pool, this.createQuery('primaryKeys', ['tables']));
    const fkColumns = await this.driver.query(this.pool, this.createQuery('foreignKeys', ['tables']));
    const views = await this.driver.query(this.pool, this.createQuery('views', ['views']));
    const routines = await this.driver.query(this.pool, this.createQuery('routines', ['procedures', 'functions']));
    // console.log('PG fkColumns', fkColumns.rows);

    return this.mergeAnalyseResult(
      {
        tables: tables.rows.map((table) => ({
          ...table,
          columns: columns.rows
            .filter((col) => col.pureName == table.pureName && col.schemaName == table.schemaName)
            .map(getColumnInfo),
          primaryKey: DatabaseAnalyser.extractPrimaryKeys(table, pkColumns.rows),
          foreignKeys: DatabaseAnalyser.extractForeignKeys(table, fkColumns.rows),
        })),
        views: views.rows.map((view) => ({
          ...view,
          columns: columns.rows
            .filter((col) => col.pureName == view.pureName && col.schemaName == view.schemaName)
            .map(getColumnInfo),
        })),
        procedures: routines.rows.filter((x) => x.objectType == 'PROCEDURE'),
        functions: routines.rows.filter((x) => x.objectType == 'FUNCTION'),
      },
      (x) => `${x.objectTypeField}:${x.schemaName}.${x.pureName}`
    );
  }

  async getModifications() {
    const tableModificationsQueryData = await this.driver.query(this.pool, this.createQuery('tableModifications'));
    const viewModificationsQueryData = await this.driver.query(this.pool, this.createQuery('viewModifications'));
    const routineModificationsQueryData = await this.driver.query(this.pool, this.createQuery('routineModifications'));

    const allModifications = _.compact([
      ...tableModificationsQueryData.rows.map((x) => ({ ...x, objectTypeField: 'tables' })),
      ...viewModificationsQueryData.rows.map((x) => ({ ...x, objectTypeField: 'views' })),
      ...routineModificationsQueryData.rows
        .filter((x) => x.objectType == 'PROCEDURE')
        .map((x) => ({ ...x, objectTypeField: 'procedures' })),
      ...routineModificationsQueryData.rows
        .filter((x) => x.objectType == 'FUNCTION')
        .map((x) => ({ ...x, objectTypeField: 'functions' })),
    ]);

    const modifications = allModifications.map((x) => {
      const { objectTypeField, hashCode, pureName, schemaName } = x;

      if (!objectTypeField || !this.structure[objectTypeField]) return null;
      const obj = this.structure[objectTypeField].find((x) => x.pureName == pureName && x.schemaName == schemaName);

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
          }
        : {
            newName: { schemaName, pureName },
            action: 'add',
            objectTypeField,
          };
      return action;
    });

    return [
      ..._.compact(modifications),
      ...this.getDeletedObjects([...allModifications.map((x) => `${x.schemaName}.${x.pureName}`)]),
    ];
  }

  getDeletedObjectsForField(nameArray, objectTypeField) {
    return this.structure[objectTypeField]
      .filter((x) => !nameArray.includes(`${x.schemaName}.${x.pureName}`))
      .map((x) => ({
        oldName: _.pick(x, ['schemaName', 'pureName']),
        action: 'remove',
        objectTypeField,
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

module.exports = PostgreAnalyser;
