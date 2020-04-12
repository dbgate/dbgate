const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const DatabaseAnalayser = require('../default/DatabaseAnalyser');

const byTableFilter = (table) => (x) => x.pureName == table.pureName && x.schemaName == x.schemaName;

function extractPrimaryKeys(table, pkColumns) {
  const filtered = pkColumns.filter(byTableFilter(table));
  if (filtered.length == 0) return undefined;
  return {
    ..._.pick(filtered[0], ['constraintName', 'schemaName', 'pureName']),
    constraintType: 'primaryKey',
    columns: filtered.map(fp.pick('columnName')),
  };
}

function extractForeignKeys(table, fkColumns) {
  const grouped = _.groupBy(fkColumns.filter(byTableFilter(table)), 'constraintName');
  return _.keys(grouped).map((constraintName) => ({
    constraintName,
    constraintType: 'foreignKey',
    ..._.pick(grouped[constraintName][0], [
      'constraintName',
      'schemaName',
      'pureName',
      'refSchemaName',
      'refTableName',
      'updateAction',
      'deleteAction',
    ]),
    columns: grouped[constraintName].map(fp.pick(['columnName', 'refColumnName'])),
  }));
}

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

/** @returns {import('@dbgate/types').DbType} */
function detectType(col) {
  switch (col.dataType) {
    case 'binary':
      return {
        typeCode: 'string',
        isBinary: true,
      };

    case 'image':
      return {
        typeCode: 'string',
        isBinary: true,
        isBlob: true,
      };

    case 'timestamp':
      return {
        typeCode: 'string',
      };
    case 'varbinary':
      return {
        typeCode: 'string',
        length: col.maxLength,
        isBinary: true,
        isVarLength: true,
      };
    case 'bit':
      return {
        typeCode: 'logical',
      };

    case 'tinyint':
      return {
        typeCode: 'int',
        bytes: 1,
      };
    case 'mediumint':
      return {
        typeCode: 'int',
        bytes: 3,
      };
    case 'datetime':
      return {
        typeCode: 'datetime',
        subType: 'datetime',
      };
    case 'time':
      return {
        typeCode: 'datetime',
        subType: 'time',
      };
    case 'year':
      return {
        typeCode: 'datetime',
        subType: 'year',
      };
    case 'date':
      return {
        typeCode: 'datetime',
        subType: 'date',
      };
    case 'decimal':
    case 'numeric':
      return {
        typeCode: 'numeric',
        precision: col.precision,
        scale: col.scale,
      };
    case 'float':
      return { typeCode: 'float' };
    case 'uniqueidentifier':
      return { typeCode: 'string' };
    case 'smallint':
      return {
        typeCode: 'int',
        bytes: 2,
      };
    case 'int':
      return {
        typeCode: 'int',
        bytes: 4,
      };
    case 'bigint':
      return {
        typeCode: 'int',
        bytes: 8,
      };
    case 'real':
      return { typeCode: 'float' };
    case 'char':
      return {
        typeCode: 'string',
        length: col.maxLength,
      };
    case 'nchar':
      return { typeCode: 'string', length: col.maxLength, isUnicode: true };
    case 'varchar':
      return {
        typeCode: 'string',
        length: col.maxLength,
        isVarLength: true,
      };
    case 'nvarchar':
      return {
        typeCode: 'string',
        length: col.maxLength,
        isVarLength: true,
        isUnicode: true,
      };
    case 'text':
      return {
        typeCode: 'blob',
        isText: true,
      };
    case 'ntext':
      return {
        typeCode: 'blob',
        isText: true,
        isUnicode: true,
      };
    case 'xml':
      return {
        typeCode: 'blob',
        isXml: true,
      };
  }
  return {
    typeCode: 'generic',
    sql: col.dataType,
  };
}

class MsSqlAnalyser extends DatabaseAnalayser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  createQuery(resFileName, filterIdObjects) {
    let res = sql[resFileName];
    if (!this.modifications || !filterIdObjects || this.modifications.length == 0) {
      res = res.replace('=[OBJECT_ID_CONDITION]', ' is not null');
    } else {
      const filterIds = this.modifications
        .filter((x) => filterIdObjects.includes(x.objectTypeField) && (x.action == 'add' || x.action == 'change'))
        .map((x) => x.objectId);
      if (filterIds.length == 0) {
        res = res.replace('=[OBJECT_ID_CONDITION]', ' = 0');
      } else {
        res = res.replace('=[OBJECT_ID_CONDITION]', ` in (${filterIds.join(',')})`);
      }
    }
    return res;
  }
  async _runAnalysis() {
    const tablesRows = await this.driver.query(this.pool, this.createQuery('tables', ['tables']));
    const columnsRows = await this.driver.query(this.pool, this.createQuery('columns', ['tables']));
    const pkColumnsRows = await this.driver.query(this.pool, this.createQuery('primaryKeys', ['tables']));
    const fkColumnsRows = await this.driver.query(this.pool, this.createQuery('foreignKeys', ['tables']));

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

    const tables = tablesRows.rows.map((row) => ({
      ...row,
      columns: columnsRows.rows
        .filter((col) => col.objectId == row.objectId)
        .map(({ isNullable, isIdentity, ...col }) => ({
          ...col,
          notNull: !isNullable,
          autoIncrement: !!isIdentity,
          commonType: detectType(col),
        })),
      primaryKey: extractPrimaryKeys(row, pkColumnsRows.rows),
      foreignKeys: extractForeignKeys(row, fkColumnsRows.rows),
    }));

    const views = viewsRows.rows.map((row) => ({
      ...row,
      createSql: getCreateSql(row),
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

      /** @type {import('@dbgate/types').DatabaseModification} */
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
