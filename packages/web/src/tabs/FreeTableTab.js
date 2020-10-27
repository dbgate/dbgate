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
  const storageKey = `tabdata_freetable_${tabid}`;

  React.useEffect(() => {
    const existingData = localStorage.getItem(storageKey);
    if (existingData) {
      const value = JSON.parse(existingData);
      // @ts-ignore
      dispatchModel({ type: 'reset', value });
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(modelState.value));
  }, [modelState]);

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
