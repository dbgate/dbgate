import React from 'react';
import { createGridCache, createChangeSet, createGridConfig, createFreeTableModel } from '@dbgate/datalib';
import useUndoReducer from '../utility/useUndoReducer';
import usePropsCompare from '../utility/usePropsCompare';
import { useUpdateDatabaseForTab } from '../utility/globalState';
import TableDataGrid from '../datagrid/TableDataGrid';
import useGridConfig from '../utility/useGridConfig';
import FreeTableGrid from '../freetable/FreeTableGrid';

export default function FreeDataTab({ conid, database, schemaName, pureName, tabVisible, toolbarPortalRef, tabid }) {
  const [config, setConfig] = useGridConfig(tabid);
  const [modelState, dispatchModel] = useUndoReducer(createFreeTableModel());

  return (
    <FreeTableGrid
      conid={conid}
      config={config}
      setConfig={setConfig}
      modelState={modelState}
      dispatchModel={dispatchModel}
      tabVisible={tabVisible}
      toolbarPortalRef={toolbarPortalRef}
    />
  );
}
