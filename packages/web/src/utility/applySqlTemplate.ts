import { getDbCore, getConnectionInfo, getSqlObjectInfo } from './metadataLoaders';
import sqlFormatter from 'sql-formatter';
import { driverBase, findEngineDriver } from 'dbgate-tools';

export default async function applySqlTemplate(sqlTemplate, extensions, props) {
  if (sqlTemplate == 'CREATE TABLE') {
    const tableInfo = await getDbCore(props, props.objectTypeField || 'tables');
    const connection = await getConnectionInfo(props);
    const driver = findEngineDriver(connection, extensions) || driverBase;
    const dmp = driver.createDumper();
    if (tableInfo) dmp.createTable(tableInfo);
    return dmp.s;
  }
  if (sqlTemplate == 'CREATE OBJECT') {
    const objectInfo = await getSqlObjectInfo(props);
    if (objectInfo) {
      if (objectInfo.requiresFormat && objectInfo.createSql) return sqlFormatter.format(objectInfo.createSql);
      else return objectInfo.createSql;
    }
  }
  if (sqlTemplate == 'EXECUTE PROCEDURE') {
    const procedureInfo = await getSqlObjectInfo(props);
    const connection = await getConnectionInfo(props);

    const driver = findEngineDriver(connection, extensions) || driverBase;
    const dmp = driver.createDumper();
    if (procedureInfo) dmp.put('^execute %f', procedureInfo);
    return dmp.s;
  }

  return null;
}
