import { getDbCore, getConnectionInfo, getSqlObjectInfo } from './metadataLoaders';
import sqlFormatter from 'sql-formatter';
import { driverBase, findEngineDriver } from 'dbgate-tools';

async function generateTableSql(extensions, props, dumpProc, format = false) {
  const tableInfo = await getDbCore(props, props.objectTypeField || 'tables');
  const connection = await getConnectionInfo(props);
  const driver = findEngineDriver(connection, extensions) || driverBase;
  const dmp = driver.createDumper();
  if (tableInfo) dumpProc(dmp, tableInfo);
  return format ? sqlFormatter.format(dmp.s) : dmp.s;
}

export default async function applyScriptTemplate(scriptTemplate, extensions, props) {
  if (scriptTemplate == 'CREATE TABLE') {
    return generateTableSql(extensions, props, (dmp, tableInfo) => dmp.createTable(tableInfo));
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
      true
    );
  }
  if (scriptTemplate == 'CREATE OBJECT') {
    const objectInfo = await getSqlObjectInfo(props);
    if (objectInfo) {
      if (objectInfo.requiresFormat && objectInfo.createSql) return sqlFormatter.format(objectInfo.createSql);
      else return objectInfo.createSql;
    }
  }
  if (scriptTemplate == 'ALTER OBJECT') {
    const objectInfo = await getSqlObjectInfo(props);
    if (objectInfo) {
      const createSql =
        objectInfo.requiresFormat && objectInfo.createSql
          ? sqlFormatter.format(objectInfo.createSql)
          : objectInfo.createSql || '';
      const alterPrefix = createSql.trimStart().startsWith('CREATE ') ? 'ALTER ' : 'alter ';
      return createSql.replace(/^\s*create\s+/i, alterPrefix);
    }
  }
  if (scriptTemplate == 'EXECUTE PROCEDURE') {
    const procedureInfo = await getSqlObjectInfo(props);
    const connection = await getConnectionInfo(props);

    const driver = findEngineDriver(connection, extensions) || driverBase;
    const dmp = driver.createDumper();
    if (procedureInfo) dmp.put('^execute %f', procedureInfo);
    return dmp.s;
  }

  const connection = await getConnectionInfo(props);
  const driver = findEngineDriver(connection, extensions) || driverBase;
  const res = await driver.getScriptTemplateContent(scriptTemplate, props);

  return res;
}
