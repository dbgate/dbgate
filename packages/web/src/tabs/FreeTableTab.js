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
import LoadingInfo from '../widgets/LoadingInfo';
import { changeTab } from '../utility/common';
import ErrorInfo from '../widgets/ErrorInfo';

export default function FreeDataTab({ archiveFolder, archiveFile, tabVisible, toolbarPortalRef, tabid, initialData }) {
  const [config, setConfig] = useGridConfig(tabid);
  const [modelState, dispatchModel] = useUndoReducer(createFreeTableModel());
  const storageKey = `tabdata_freetable_${tabid}`;
  const saveSqlFileModalState = useModalState();
  const setOpenedTabs = useSetOpenedTabs();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState(null);

  const handleLoadInitialData = async () => {
    setIsLoading(true);
    try {
      const resp = await axios.post('runners/load-reader', initialData);
      // @ts-ignore
      dispatchModel({ type: 'reset', value: resp.data });
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      const errorMessage = (err && err.response && err.response.data && err.response.data.error) || 'Loading failed';
      setErrorMessage(errorMessage);
      console.error(err.response);
    }
  };

  React.useEffect(() => {
    const existingData = localStorage.getItem(storageKey);
    if (existingData) {
      const value = JSON.parse(existingData);
      // @ts-ignore
      dispatchModel({ type: 'reset', value });
    } else if (initialData) {
      if (initialData.functionName) handleLoadInitialData();
      // @ts-ignore
      else dispatchModel({ type: 'reset', value: initialData });
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

  if (isLoading) {
    return <LoadingInfo wrapper message="Loading data" />;
  }
  if (errorMessage) {
    return <ErrorInfo message={errorMessage} />;
  }

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
