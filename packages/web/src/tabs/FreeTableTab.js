import React from 'react';
import { createGridCache, createChangeSet, createGridConfig, createFreeTableModel } from '@dbgate/datalib';
import useUndoReducer from '../utility/useUndoReducer';
import usePropsCompare from '../utility/usePropsCompare';
import { useSetOpenedTabs, useUpdateDatabaseForTab } from '../utility/globalState';
import TableDataGrid from '../datagrid/TableDataGrid';
import useGridConfig from '../utility/useGridConfig';
import FreeTableGrid from '../freetable/FreeTableGrid';
import SaveArchiveModal from '../modals/SaveArchiveModal';
import useModalState from '../modals/useModalState';
import axios from '../utility/axios';
import { changeTab } from '../utility/common';

export default function FreeDataTab({ archiveFolder, archiveFile, tabVisible, toolbarPortalRef, tabid, initialData }) {
  const [config, setConfig] = useGridConfig(tabid);
  const [modelState, dispatchModel] = useUndoReducer(initialData || createFreeTableModel());
  const storageKey = `tabdata_freetable_${tabid}`;
  const saveSqlFileModalState = useModalState();
  const setOpenedTabs = useSetOpenedTabs();

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

  const handleSave = async (folder, file) => {
    await axios.post('archive/save-free-table', { folder, file, data: modelState.value });
    changeTab(tabid, setOpenedTabs, (tab) => ({
      ...tab,
      title: file,
      props: { archiveFIle: file, archiveFolder: folder },
    }));
  };

  return (
    <>
      <FreeTableGrid
        config={config}
        setConfig={setConfig}
        modelState={modelState}
        dispatchModel={dispatchModel}
        tabVisible={tabVisible}
        toolbarPortalRef={toolbarPortalRef}
        onSave={() => saveSqlFileModalState.open()}
      />
      <SaveArchiveModal
        modalState={saveSqlFileModalState}
        folder={archiveFolder}
        file={archiveFile}
        onSave={handleSave}
      />
    </>
  );
}
