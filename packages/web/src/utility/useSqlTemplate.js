import React from 'react';

import { getDbCore, getConnectionInfo, getSqlObjectInfo } from '../utility/metadataLoaders';
import sqlFormatter from 'sql-formatter';
import useExtensions from '../utility/useExtensions';
import { driverBase, findEngineDriver } from 'dbgate-tools';

export default function useSqlTemplate(sqlTemplate, props) {
  const [sql, setSql] = React.useState('');
  const extensions = useExtensions();
  const [isLoading, setIsLoading] = React.useState(!!sqlTemplate);

  async function loadTemplate() {
    if (sqlTemplate == 'CREATE TABLE') {
      const tableInfo = await getDbCore(props, props.objectTypeField || 'tables');
      const connection = await getConnectionInfo(props);
      const driver = findEngineDriver(connection, extensions) || driverBase;
      const dmp = driver.createDumper();
      if (tableInfo) dmp.createTable(tableInfo);
      setSql(dmp.s);
    }
    if (sqlTemplate == 'CREATE OBJECT') {
      const objectInfo = await getSqlObjectInfo(props);
      if (objectInfo) {
        if (objectInfo.requiresFormat && objectInfo.createSql) setSql(sqlFormatter.format(objectInfo.createSql));
        else setSql(objectInfo.createSql);
      }
    }
    if (sqlTemplate == 'EXECUTE PROCEDURE') {
      const procedureInfo = await getSqlObjectInfo(props);
      const connection = await getConnectionInfo(props);

      const driver = findEngineDriver(connection, extensions) || driverBase;
      const dmp = driver.createDumper();
      if (procedureInfo) dmp.put('^execute %f', procedureInfo);
      setSql(dmp.s);
    }
    setIsLoading(false);
  }

  React.useEffect(() => {
    if (sqlTemplate) {
      loadTemplate();
    }
  }, []);

  return [sql, isLoading];
}
