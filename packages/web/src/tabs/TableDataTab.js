import React from 'react';
import { createGridCache, createChangeSet } from '@dbgate/datalib';
import useUndoReducer from '../utility/useUndoReducer';
import usePropsCompare from '../utility/usePropsCompare';
import { useUpdateDatabaseForTab } from '../utility/globalState';
import TableDataGrid from '../datagrid/TableDataGrid';

export default function TableDataTab({ conid, database, schemaName, pureName, tabVisible, toolbarPortalRef }) {
  const [cache, setCache] = React.useState(createGridCache());
  const [changeSetState, dispatchChangeSet] = useUndoReducer(createChangeSet());
  useUpdateDatabaseForTab(tabVisible, conid, database);

  return (
    <TableDataGrid
      conid={conid}
      database={database}
      schemaName={schemaName}
      pureName={pureName}
      tabVisible={tabVisible}
      toolbarPortalRef={toolbarPortalRef}
      cache={cache}
      setCache={setCache}
      changeSetState={changeSetState}
      dispatchChangeSet={dispatchChangeSet}
    />
  );
}
