const _ = require('lodash');
const sql = require('./sql');
const { getDataTypeString, getTriggerTiming, getTriggerEventType } = require('./helpers');

const { DatabaseAnalyser } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
  }

  async _runAnalysis() {
    const tablesResult = await this.driver.query(this.dbhan, sql.tables);
    const columnsResult = await this.driver.query(this.dbhan, sql.columns);
    const triggersResult = await this.driver.query(this.dbhan, sql.triggers);
    const primaryKeysResult = await this.driver.query(this.dbhan, sql.primaryKeys);
    const foreignKeysResult = await this.driver.query(this.dbhan, sql.foreignKeys);
    const functionsResults = await this.driver.query(this.dbhan, sql.functions);
    const functionParametersResults = await this.driver.query(this.dbhan, sql.functionParameters);
    const proceduresResults = await this.driver.query(this.dbhan, sql.procedures);
    const procedureParametersResults = await this.driver.query(this.dbhan, sql.procedureParameters);

    const columns = columnsResult.rows?.map(column => ({
      ...column,
      dataType: getDataTypeString(column),
    }));

    const triggers = triggersResult.rows?.map(i => ({
      pureName: i.PURENAME,
      tableName: i.TABLENAME,
      shcemaName: i.SCHEMANAME,
      eventType: getTriggerEventType(i.TRIGGERTYPE),
      triggerTiming: getTriggerTiming(i.TRIGGERTYPE),
    }));

    const primaryKeys = primaryKeysResult.rows ?? [];

    const foreignKeys = foreignKeysResult.rows ?? [];

    const functions = functionsResults.rows?.map(func => ({
      ...func,
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
        columns: columns.filter(
          column => column.tableName === table.pureName && column.schemaName === table.schemaName
        ),
        primaryKey: DatabaseAnalyser.extractPrimaryKeys(table, primaryKeys),
        foreignKeys: DatabaseAnalyser.extractForeignKeys(table, foreignKeys),
      })) ?? [];

    return {
      tables,
      triggers,
      functions,
      procedures,
    };
  }
}

module.exports = Analyser;
