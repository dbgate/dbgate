const _ = require('lodash');
const sql = require('./sql');
const {
  getDataTypeString,
  getTriggerTiming,
  getTriggerEventType,
  getFormattedDefaultValue,
  getTriggerCreateSql,
} = require('./helpers');

const { DatabaseAnalyser } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
  }

  async _runAnalysis() {
    const tablesResult = await this.analyserQuery(sql.tables, ['tables']);
    const columnsResult = await this.analyserQuery(sql.columns, ['tables', 'views']);
    const triggersResult = await this.analyserQuery(sql.triggers, ['triggers']);
    const primaryKeysResult = await this.analyserQuery(sql.primaryKeys, ['primaryKeys']);
    const foreignKeysResult = await this.analyserQuery(sql.foreignKeys, ['foreignKeys']);
    const functionsResults = await this.analyserQuery(sql.functions, ['functions']);
    const functionParametersResults = await this.analyserQuery(sql.functionParameters, ['functions']);
    const proceduresResults = await this.analyserQuery(sql.procedures, ['procedures']);
    const procedureParametersResults = await this.analyserQuery(sql.procedureParameters, ['procedures']);
    const viewsResults = await this.analyserQuery(sql.views, ['views']);

    const columns = columnsResult.rows?.map(column => ({
      ...column,
      objectId: `tables:${column.columnName}`,
      dataType: getDataTypeString(column),
      defaultValue: getFormattedDefaultValue(column.defaultValue),
    }));

    const triggers = triggersResult.rows?.map(i => ({
      ...i,
      objectId: `triggers:${i.pureName}`,
      eventType: getTriggerEventType(i.TRIGGERTYPE),
      triggerTiming: getTriggerTiming(i.TRIGGERTYPE),
      createSql: getTriggerCreateSql(i),
    }));

    const primaryKeys =
      primaryKeysResult.rows?.map(primaryKey => ({
        ...primaryKey,
        objectId: `tables:${primaryKey.pureName}`,
      })) ?? [];

    const foreignKeys =
      foreignKeysResult.rows?.map(foreignKey => ({
        ...foreignKey,
        objectId: `tables:${foreignKey.pureName}`,
      })) ?? [];

    const functions = functionsResults.rows?.map(func => ({
      ...func,
      objectId: `functions:${func.pureName}`,
      returnType: functionParametersResults.rows?.filter(
        param => param.owningObjectName === func.pureName && param.parameterMode === 'RETURN'
      )?.dataType,
      parameters: functionParametersResults.rows
        ?.filter(param => param.owningObjectName === func.pureName)
        .map(param => ({
          ...param,
          dataType: getDataTypeString(param),
        })),
    }));

    const procedures = proceduresResults.rows.map(proc => ({
      ...proc,
      objectId: `procedures:${proc.pureName}`,
      parameters: procedureParametersResults.rows
        ?.filter(param => param.owningObjectName === proc.pureName)
        .map(param => ({
          ...param,
          dataType: getDataTypeString(param),
        })),
    }));

    const tables =
      tablesResult.rows?.map(table => ({
        ...table,
        objectId: `tables:${table.pureName}`,
        columns: columns.filter(column => column.tableName === table.pureName),
        primaryKey: DatabaseAnalyser.extractPrimaryKeys(table, primaryKeys),
        foreignKeys: DatabaseAnalyser.extractForeignKeys(table, foreignKeys),
      })) ?? [];

    const views =
      viewsResults.rows?.map(view => ({
        ...view,
        objectId: `views:${view.pureName}`,
        columns: columns.filter(column => column.tableName === view.pureName),
      })) ?? [];

    return {
      views,
      tables,
      triggers,
      functions,
      procedures,
    };
  }

  async _computeSingleObjectId() {
    const { typeField, pureName } = this.singleObjectFilter;
    console.log('Computing single object ID for', typeField, pureName);
    this.singleObjectId = `${typeField}:${pureName}`;
  }
}

module.exports = Analyser;
