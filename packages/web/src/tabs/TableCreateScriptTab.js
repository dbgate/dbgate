import React from 'react';
import engines from '@dbgate/engines';
import useTableInfo from '../utility/useTableInfo';
import useConnectionInfo from '../utility/useConnectionInfo';
import SqlEditor from '../sqleditor/SqlEditor';

export default function TableCreateScriptTab({ conid, database, schemaName, pureName }) {
  const tableInfo = useTableInfo({ conid, database, schemaName, pureName });
  const connnection = useConnectionInfo(conid);
  if (!connnection || !tableInfo) return null;
  // console.log(tableInfo);

  const driver = engines(connnection.engine);
  const dmp = driver.createDumper();
  if (tableInfo) dmp.createTable(tableInfo);

  return <SqlEditor engine={connnection && connnection.engine} value={dmp.s} />;
}
