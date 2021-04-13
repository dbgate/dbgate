const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const { DatabaseAnalyser } = require('dbgate-tools');
const { isTypeString, isTypeNumeric } = require('dbgate-tools');
const { rangeStep } = require('lodash/fp');

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

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  createQuery(resFileName, typeFields) {
    let res = sql[resFileName];
    if (this.singleObjectFilter) {
      const { typeField, pureName } = this.singleObjectFilter;
      if (!typeFields || !typeFields.includes(typeField)) return null;
      res = res.replace('=[OBJECT_NAME_CONDITION]', ` = '${pureName}'`).replace('#DATABASE#', this.pool._database_name);
      return res;
    }
    if (!this.modifications || !typeFields || this.modifications.length == 0) {
      res = res.replace('=[OBJECT_NAME_CONDITION]', ' is not null');
    } else {
      const filterNames = this.modifications
        .filter(x => typeFields.includes(x.objectTypeField) && (x.action == 'add' || x.action == 'change'))
        .map(x => x.newName && x.newName.pureName)
        .filter(Boolean);
      if (filterNames.length == 0) {
        res = res.replace('=[OBJECT_NAME_CONDITION]', ' IS NULL');
      } else {
        res = res.replace('=[OBJECT_NAME_CONDITION]', ` in (${filterNames.map(x => `'${x}'`).join(',')})`);
      }
    }
    res = res.replace('#DATABASE#', this.pool._database_name);
    return res;
  }

  getRequestedViewNames(allViewNames) {
    if (this.singleObjectFilter) {
      const { typeField, pureName } = this.singleObjectFilter;
      if (typeField == 'views') return [pureName];
    }
    if (this.modifications) {
      return this.modifications.filter(x => x.objectTypeField == 'views').map(x => x.newName.pureName);
    }
    return allViewNames;
  }

  async getViewTexts(allViewNames) {
    const res = {};
    for (const viewName of this.getRequestedViewNames(allViewNames)) {
      const resp = await this.driver.query(this.pool, `SHOW CREATE VIEW \`${viewName}\``);
      res[viewName] = resp.rows[0]['Create View'];
    }
    return res;
  }

  async _runAnalysis() {
    const tables = await this.driver.query(this.pool, this.createQuery('tables', ['tables']));
    const columns = await this.driver.query(this.pool, this.createQuery('columns', ['tables', 'views']));
    const pkColumns = await this.driver.query(this.pool, this.createQuery('primaryKeys', ['tables']));
    const fkColumns = await this.driver.query(this.pool, this.createQuery('foreignKeys', ['tables']));
    const views = await this.driver.query(this.pool, this.createQuery('views', ['views']));
    const programmables = await this.driver.query(
      this.pool,
      this.createQuery('programmables', ['procedures', 'functions'])
    );

    const viewTexts = await this.getViewTexts(views.rows.map(x => x.pureName));

    return this.mergeAnalyseResult({
      tables: tables.rows.map(table => ({
        ...table,
        objectId: table.pureName,
        columns: columns.rows.filter(col => col.pureName == table.pureName).map(getColumnInfo),
        primaryKey: DatabaseAnalyser.extractPrimaryKeys(table, pkColumns.rows),
        foreignKeys: DatabaseAnalyser.extractForeignKeys(table, fkColumns.rows),
      })),
      views: views.rows.map(view => ({
        ...view,
        objectId: view.pureName,
        columns: columns.rows.filter(col => col.pureName == view.pureName).map(getColumnInfo),
        createSql: viewTexts[view.pureName],
        requiresFormat: true,
      })),
      procedures: programmables.rows
        .filter(x => x.objectType == 'PROCEDURE')
        .map(fp.omit(['objectType']))
        .map(x => ({ ...x, objectId: x.pureName })),
      functions: programmables.rows
        .filter(x => x.objectType == 'FUNCTION')
        .map(fp.omit(['objectType']))
        .map(x => ({ ...x, objectId: x.pureName })),
    });
  }

  getDeletedObjectsForField(nameArray, objectTypeField) {
    return this.structure[objectTypeField]
      .filter(x => !nameArray.includes(x.pureName))
      .map(x => ({
        oldName: _.pick(x, ['pureName']),
        action: 'remove',
        objectTypeField,
        objectId: x.pureName,
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
      ...tableModificationsQueryData.rows.map(x => {
        if (x.objectType == 'BASE TABLE') return { ...x, objectTypeField: 'tables' };
        if (x.objectType == 'VIEW') return { ...x, objectTypeField: 'views' };
        return null;
      }),
      ...procedureModificationsQueryData.rows.map(x => ({
        objectTypeField: 'procedures',
        modifyDate: x.Modified,
        pureName: x.Name,
      })),
      ...functionModificationsQueryData.rows.map(x => ({
        objectTypeField: 'functions',
        modifyDate: x.Modified,
        pureName: x.Name,
      })),
    ]);

    // console.log('allModifications', allModifications);
    // console.log(
    //   'DATES',
    //   this.structure.procedures.map((x) => x.modifyDate)
    // );
    // console.log('MOD - SRC', modifications);
    // console.log(
    //   'MODs',
    //   this.structure.tables.map((x) => x.modifyDate)
    // );
    const modifications = allModifications.map(x => {
      const { objectType, modifyDate, pureName } = x;
      const field = objectTypeToField(objectType);

      if (!field || !this.structure[field]) return null;
      // @ts-ignore
      const obj = this.structure[field].find(x => x.pureName == pureName);

      // object not modified
      if (obj && Math.abs(new Date(modifyDate).getTime() - new Date(obj.modifyDate).getTime()) < 1000) return null;

      // console.log('MODIFICATION OF ', field, pureName, modifyDate, obj.modifyDate);

      /** @type {import('dbgate-types').DatabaseModification} */
      const action = obj
        ? {
            newName: { pureName },
            oldName: _.pick(obj, ['pureName']),
            action: 'change',
            objectTypeField: field,
            objectId: pureName,
          }
        : {
            newName: { pureName },
            action: 'add',
            objectTypeField: field,
            objectId: pureName,
          };
      return action;
    });

    return [..._.compact(modifications), ...this.getDeletedObjects([...allModifications.map(x => x.pureName)])];
  }
}

module.exports = Analyser;
