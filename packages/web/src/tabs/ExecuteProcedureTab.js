import React from 'react';
import engines from '@dbgate/engines';
import { useConnectionInfo, useSqlObjectInfo } from '../utility/metadataLoaders';
import QueryTab from './QueryTab';

export default function ExecuteProcedureTab(props) {
  const procedureInfo = useSqlObjectInfo(props);
  const connnection = useConnectionInfo(props);
  if (!connnection || !procedureInfo) return null;

  const driver = engines(connnection.engine);
  const dmp = driver.createDumper();
  if (procedureInfo) dmp.put('^execute %f', procedureInfo);

  return <QueryTab {...props} initialScript={dmp.s} />;
}
