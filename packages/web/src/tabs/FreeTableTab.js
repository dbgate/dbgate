import React from 'react';
import { createFreeTableModel } from 'dbgate-datalib';
import useUndoReducer from '../utility/useUndoReducer';
import { useSetOpenedTabs } from '../utility/globalState';
import useGridConfig from '../utility/useGridConfig';
import FreeTableGrid from '../freetable/FreeTableGrid';
import SaveArchiveModal from '../modals/SaveArchiveModal';
import useModalState from '../modals/useModalState';
import axios from '../utility/axios';
import LoadingInfo from '../widgets/LoadingInfo';
import { changeTab } from '../utility/common';
import ErrorInfo from '../widgets/ErrorInfo';
import useEditorData from '../utility/useEditorData';

export default function FreeDataTab({ archiveFolder, archiveFile, tabVisible, toolbarPortalRef, tabid, initialArgs }) {
  const [config, setConfig] = useGridConfig(tabid);
  const [modelState, dispatchModel] = useUndoReducer(createFreeTableModel());
  const saveArchiveModalState = useModalState();
  const setOpenedTabs = useSetOpenedTabs();
  const { initialData, setEditorData, errorMessage, isLoading } = useEditorData({
    tabid,
    loadFromArgs:
      initialArgs && initialArgs.functionName
        ? () => axios.post('runners/load-reader', initialArgs).then(x => x.data)
        : null,
  });

  React.useEffect(() => {
    // @ts-ignore
    if (initialData) dispatchModel({ type: 'reset', value: initialData });
  }, [initialData]);

  React.useEffect(() => {
    setEditorData(modelState.value);
  }, [modelState]);

  const handleSave = async (folder, file) => {
    await axios.post('archive/save-free-table', { folder, file, data: modelState.value });
    changeTab(tabid, setOpenedTabs, tab => ({
      ...tab,
      title: file,
      props: { archiveFile: file, archiveFolder: folder },
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
        onSave={() => saveArchiveModalState.open()}
      />
      <SaveArchiveModal modalState={saveArchiveModalState} folder={archiveFolder} file={archiveFile} onSave={handleSave} />
    </>
  );
}
