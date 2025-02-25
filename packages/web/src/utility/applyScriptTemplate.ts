import { getDbCore, getConnectionInfo, getSqlObjectInfo } from './metadataLoaders';
import sqlFormatter from 'sql-formatter';
import { driverBase, findEngineDriver } from 'dbgate-tools';
import { DatabaseInfo } from 'dbgate-types';

function extractDbObjectInfo(dbinfo: DatabaseInfo, { objectTypeField, pureName, schemaName }) {
  if (!dbinfo) return null;
  return dbinfo[objectTypeField || 'tables'].find(x => x.pureName == pureName && x.schemaName == schemaName);
}

async function generateTableSql(extensions, props, dumpProc, format = false, dbinfo?: DatabaseInfo, connectionInfo?) {
  const tableInfo = dbinfo
    ? extractDbObjectInfo(dbinfo, props)
    : await getDbCore(props, props.objectTypeField || 'tables');
  const connection = connectionInfo || (await getConnectionInfo(props));
  const driver = findEngineDriver(connection, extensions) || driverBase;
  const dmp = driver.createDumper();
  if (tableInfo) dumpProc(dmp, tableInfo);
  return format ? sqlFormatter.format(dmp.s) : dmp.s;
}

export default async function applyScriptTemplate(
  scriptTemplate,
  extensions,
  props,
  dbinfo?: DatabaseInfo,
  connectionInfo?
) {
  if (scriptTemplate == 'CREATE TABLE') {
    return generateTableSql(
      extensions,
      props,
      (dmp, tableInfo) => dmp.createTable(tableInfo),
      false,
      dbinfo,
      connectionInfo
    );
  }
  if (scriptTemplate == 'SELECT') {
    return generateTableSql(
      extensions,
      props,
      (dmp, tableInfo) => {
        dmp.put(
          '^select %,i ^from %f',
          tableInfo.columns.map(x => x.columnName),
          tableInfo
        );
      },
      true,
      dbinfo,
      connectionInfo
    );
  }
  if (scriptTemplate == 'INSERT') {
    return generateTableSql(
      extensions,
      props,
      (dmp, tableInfo) => {
        dmp.put(
          '^insert ^into %f (%,i) ^values (%,v)',
          tableInfo,
          tableInfo.columns.map(x => x.columnName),
          tableInfo.columns.map(x => null)
        );
      },
      true,
      dbinfo,
      connectionInfo
    );
  }
  if (scriptTemplate == 'CREATE OBJECT') {
    const objectInfo = dbinfo ? extractDbObjectInfo(dbinfo, props) : await getSqlObjectInfo(props);
    if (objectInfo) {
      if (objectInfo.requiresFormat && objectInfo.createSql) return sqlFormatter.format(objectInfo.createSql);
      else return objectInfo.createSql;
    }
  }
  if (scriptTemplate == 'ALTER OBJECT') {
    const objectInfo = dbinfo ? extractDbObjectInfo(dbinfo, props) : await getSqlObjectInfo(props);
    if (objectInfo) {
      const createSql =
        objectInfo.requiresFormat && objectInfo.createSql
          ? sqlFormatter.format(objectInfo.createSql)
          : objectInfo.createSql || '';
      const alterPrefix = createSql.trimStart().startsWith('CREATE ') ? 'ALTER ' : 'alter ';
      return createSql.replace(/^\s*create\s+/i, alterPrefix);
    }
  }
  if (scriptTemplate == 'CALL OBJECT') {
    const procedureInfo = dbinfo ? extractDbObjectInfo(dbinfo, props) : await getSqlObjectInfo(props);
    const connection = connectionInfo || (await getConnectionInfo(props));

    const driver = findEngineDriver(connection, extensions) || driverBase;
    const dmp = driver.createDumper();
    if (procedureInfo) {
      dmp.callableTemplate(procedureInfo);
    }
    return dmp.s;
  }

  const connection = connectionInfo || (await getConnectionInfo(props));
  const driver = findEngineDriver(connection, extensions) || driverBase;
  const res = await driver.getScriptTemplateContent(scriptTemplate, props);

  return res;
}

export function getSupportedScriptTemplates(objectTypeField: string): { label: string; scriptTemplate: string }[] {
  switch (objectTypeField) {
    case 'tables':
      return [
        { label: 'CREATE TABLE', scriptTemplate: 'CREATE TABLE' },
        { label: 'SELECT', scriptTemplate: 'SELECT' },
        { label: 'INSERT', scriptTemplate: 'INSERT' },
      ];
    case 'views':
      return [
        {
          label: 'CREATE VIEW',
          scriptTemplate: 'CREATE OBJECT',
        },
        {
          label: 'ALTER VIEW',
          scriptTemplate: 'ALTER OBJECT',
        },
        {
          label: 'CREATE TABLE',
          scriptTemplate: 'CREATE TABLE',
        },
        {
          label: 'SELECT',
          scriptTemplate: 'SELECT',
        },
      ];
    case 'matviews':
      return [
        {
          label: 'CREATE MATERIALIZED VIEW',
          scriptTemplate: 'CREATE OBJECT',
        },
        {
          label: 'ALTER MATERIALIZED VIEW',
          scriptTemplate: 'ALTER OBJECT',
        },
        {
          label: 'CREATE TABLE',
          scriptTemplate: 'CREATE TABLE',
        },
        {
          label: 'SELECT',
          scriptTemplate: 'SELECT',
        },
      ];

    case 'procedures':
      return [
        {
          label: 'CREATE PROCEDURE',
          scriptTemplate: 'CREATE OBJECT',
        },
        {
          label: 'ALTER PROCEDURE',
          scriptTemplate: 'ALTER OBJECT',
        },
        {
          label: 'EXECUTE',
          scriptTemplate: 'CALL OBJECT',
        },
      ];

    case 'functions':
      return [
        {
          label: 'CREATE FUNCTION',
          scriptTemplate: 'CREATE OBJECT',
        },
        {
          label: ' ALTER FUNCTION',
          scriptTemplate: 'ALTER OBJECT',
        },
        {
          label: 'CALL',
          scriptTemplate: 'CALL OBJECT',
        },
      ];
    case 'triggers':
      return [
        {
          label: 'CREATE TRIGGER',
          scriptTemplate: 'CREATE OBJECT',
        },
      ];
    case 'schedulerEvents':
      return [
        {
          label: 'CREATE SCHEDULER EVENT',
          scriptTemplate: 'CREATE OBJECT',
        },
      ];
  }

  return [];
}
