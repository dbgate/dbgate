import React from 'react';
import { useConnectionInfo, useViewInfo } from '../utility/metadataLoaders';
import SqlEditor from '../sqleditor/SqlEditor';

export default function ViewCreateScriptTab({ conid, database, schemaName, pureName }) {
  const viewInfo = useViewInfo({ conid, database, schemaName, pureName });
  const connnection = useConnectionInfo({ conid });
  if (!connnection || !viewInfo) return null;

  return <SqlEditor engine={connnection && connnection.engine} value={viewInfo.createSql} readOnly />;
}
