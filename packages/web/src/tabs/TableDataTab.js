import React from 'react';
import { createGridCache, createChangeSet, createGridConfig } from '@dbgate/datalib';
import useUndoReducer from '../utility/useUndoReducer';
import usePropsCompare from '../utility/usePropsCompare';
import { useUpdateDatabaseForTab } from '../utility/globalState';
import TableDataGrid from '../datagrid/TableDataGrid';

export default function TableDataTab({ conid, database, schemaName, pureName, tabVisible, toolbarPortalRef, tabid }) {
  const [changeSetState, dispatchChangeSet] = useUndoReducer(createChangeSet());
  useUpdateDatabaseForTab(tabVisible, conid, database);
  // const [config, setConfig] = React.useState(createGridConfig());

  return (
    <TableDataGrid
      conid={conid}
      // config={config}
      database={database}
      schemaName={schemaName}
      pureName={pureName}
      tabVisible={tabVisible}
      toolbarPortalRef={toolbarPortalRef}
      changeSetState={changeSetState}
      dispatchChangeSet={dispatchChangeSet}
    />
  );
}
