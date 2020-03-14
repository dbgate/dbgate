const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql')

const DatabaseAnalayser = require('../default/DatabaseAnalyser');

const byTableFilter = table => x => x.pureName == table.pureName && x.schemaName == x.schemaName;

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
  return _.keys(grouped).map(constraintName => ({
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

  async createQuery(
    resFileName,
    tables = false,
    views = false,
    procedures = false,
    functions = false,
    triggers = false
  ) {
    let res = sql[resFileName];
    res = res.replace('=[OBJECT_ID_CONDITION]', ' is not null');
    return res;
  }
  async runAnalysis() {
    const tables = await this.driver.query(this.pool, await this.createQuery('tables'));
    const columns = await this.driver.query(this.pool, await this.createQuery('columns'));
    const pkColumns = await this.driver.query(this.pool, await this.createQuery('primaryKeys'));
    const fkColumns = await this.driver.query(this.pool, await this.createQuery('foreignKeys'));

    this.result.tables = tables.rows.map(table => ({
      ...table,
      columns: columns.rows
        .filter(col => col.objectId == table.objectId)
        .map(({ isNullable, isIdentity, ...col }) => ({
          ...col,
          notNull: !isNullable,
          autoIncrement: !!isIdentity,
          commonType: detectType(col),
        })),
      primaryKey: extractPrimaryKeys(table, pkColumns.rows),
      foreignKeys: extractForeignKeys(table, fkColumns.rows),
    }));
  }
}

module.exports = MsSqlAnalyser;
