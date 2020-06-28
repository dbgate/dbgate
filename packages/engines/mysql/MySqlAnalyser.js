const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const DatabaseAnalayser = require('../default/DatabaseAnalyser');
const { isTypeString, isTypeNumeric } = require('@dbgate/tools');

function getColumnInfo({
  isNullable,
  extra,
  columnName,
  dataType,
  charMaxLength,
  numericPrecision,
  numericScale,
  defaultValue,
}) {
  let fullDataType = dataType;
  if (charMaxLength && isTypeString(dataType)) fullDataType = `${dataType}(${charMaxLength})`;
  if (numericPrecision && numericScale && isTypeNumeric(dataType))
    fullDataType = `${dataType}(${numericPrecision},${numericScale})`;
  return {
    notNull: !isNullable || isNullable == 'NO' || isNullable == 'no',
    autoIncrement: extra && extra.toLowerCase().includes('auto_increment'),
    columnName,
    dataType: fullDataType,
    defaultValue,
  };
}

function objectTypeToField(type) {
  if (type == 'VIEW') return 'views';
  if (type == 'BASE TABLE') return 'tables';
  return null;
}

class MySqlAnalyser extends DatabaseAnalayser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  createQuery(resFileName, typeFields) {
    let res = sql[resFileName];
    if (this.singleObjectFilter) {
      const { typeField, pureName } = this.singleObjectFilter;
      if (!typeFields || !typeFields.includes(typeField)) return null;
      return res.replace('=[OBJECT_NAME_CONDITION]', ` = ${pureName}`).replace('#DATABASE#', this.pool._database_name);
    }
    if (!this.modifications || !typeFields || this.modifications.length == 0) {
      res = res.replace('=[OBJECT_NAME_CONDITION]', ' is not null');
    } else {
      const filterNames = this.modifications
        .filter((x) => typeFields.includes(x.objectTypeField) && (x.action == 'add' || x.action == 'change'))
        .map((x) => x.objectId);
      if (filterNames.length == 0) {
        res = res.replace('=[OBJECT_NAME_CONDITION]', ' IS NULL');
      } else {
        res = res.replace('=[OBJECT_NAME_CONDITION]', ` in (${filterNames.map((x) => `'${x}'`).join(',')})`);
      }
    }
    res = res.replace('#DATABASE#', this.pool._database_name);
    return res;
  }

  async _runAnalysis() {
    const tables = await this.driver.query(this.pool, this.createQuery('tables'));
    const columns = await this.driver.query(this.pool, this.createQuery('columns'));
    const pkColumns = await this.driver.query(this.pool, this.createQuery('primaryKeys'));
    const fkColumns = await this.driver.query(this.pool, this.createQuery('foreignKeys'));
    const views = await this.driver.query(this.pool, this.createQuery('views'));
    const programmables = await this.driver.query(this.pool, this.createQuery('programmables'));

    return this.mergeAnalyseResult({
      tables: tables.rows.map((table) => ({
        ...table,
        columns: columns.rows.filter((col) => col.pureName == table.pureName).map(getColumnInfo),
        primaryKey: DatabaseAnalayser.extractPrimaryKeys(table, pkColumns.rows),
        foreignKeys: DatabaseAnalayser.extractForeignKeys(table, fkColumns.rows),
      })),
      views: views.rows.map((view) => ({
        ...view,
        columns: columns.rows.filter((col) => col.pureName == view.pureName).map(getColumnInfo),
      })),
      procedures: programmables.rows.filter((x) => x.objectType == 'PROCEDURE').map(fp.omit(['objectType'])),
      functions: programmables.rows.filter((x) => x.objectType == 'FUNCTION').map(fp.omit(['objectType'])),
    });
  }

  getDeletedObjectsForField(nameArray, objectTypeField) {
    return this.structure[objectTypeField]
      .filter((x) => !nameArray.includes(x.pureName))
      .map((x) => ({
        oldName: _.pick(x, ['pureName']),
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

  async getModifications() {
    const tableModificationsQueryData = await this.driver.query(this.pool, this.createQuery('tableModifications'));
    const procedureModificationsQueryData = await this.driver.query(
      this.pool,
      this.createQuery('procedureModifications')
    );
    const functionModificationsQueryData = await this.driver.query(
      this.pool,
      this.createQuery('functionModifications')
    );

    const allModifications = _.compact([
      ...tableModificationsQueryData.rows.map((x) => {
        if (x.objectType == 'BASE TABLE') return { ...x, objectTypeField: 'tables' };
        if (x.objectType == 'VIEW') return { ...x, objectTypeField: 'views' };
        return null;
      }),
      procedureModificationsQueryData.rows.map((x) => ({
        objectTypeField: 'procedures',
        modifyDate: x.Modified,
        pureName: x.Name,
      })),
      functionModificationsQueryData.rows.map((x) => ({
        objectTypeField: 'functions',
        modifyDate: x.Modified,
        pureName: x.Name,
      })),
    ]);
    // console.log('MOD - SRC', modifications);
    // console.log(
    //   'MODs',
    //   this.structure.tables.map((x) => x.modifyDate)
    // );
    const modifications = allModifications.map((x) => {
      const { objectType, modifyDate, pureName } = x;
      const field = objectTypeToField(objectType);

      if (!field || !this.structure[field]) return null;
      // @ts-ignore
      const obj = this.structure[field].find((x) => x.pureName == pureName);

      // object not modified
      if (obj && Math.abs(new Date(modifyDate).getTime() - new Date(obj.modifyDate).getTime()) < 1000) return null;

      /** @type {import('@dbgate/types').DatabaseModification} */
      const action = obj
        ? {
            newName: { pureName },
            oldName: _.pick(obj, ['pureName']),
            action: 'change',
            objectTypeField: field,
          }
        : {
            newName: { pureName },
            action: 'add',
            objectTypeField: field,
          };
      return action;
    });

    return [..._.compact(modifications), ...this.getDeletedObjects([...allModifications.map((x) => x.pureName)])];
  }
}

module.exports = MySqlAnalyser;
