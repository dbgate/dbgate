import React from 'react';
import { useConnectionInfo, useSqlObjectInfo } from '../utility/metadataLoaders';
import SqlEditor from '../sqleditor/SqlEditor';

export default function SqlObjectCreateScriptTab({ objectTypeField, conid, database, schemaName, pureName }) {
  const sqlObjectInfo = useSqlObjectInfo({ conid, database, schemaName, pureName, objectTypeField });
  const connnection = useConnectionInfo({ conid });
  if (!connnection || !sqlObjectInfo) return null;

  return <SqlEditor engine={connnection && connnection.engine} value={sqlObjectInfo.createSql} readOnly />;
}
