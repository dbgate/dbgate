import React from 'react';
import _ from 'lodash';
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
import SaveTabModal from '../modals/SaveTabModal';
import ChartEditor from '../charts/ChartEditor';

export default function ChartTab({ tabVisible, toolbarPortalRef, tabid }) {
  const [modelState, dispatchModel] = useUndoReducer(createFreeTableModel());
  const saveFileModalState = useModalState();
  const { initialData, setEditorData, errorMessage, isLoading } = useEditorData({
    tabid,
  });

  React.useEffect(() => {
    // @ts-ignore
    if (initialData) dispatchModel({ type: 'reset', value: initialData });
  }, [initialData]);

  React.useEffect(() => {
    setEditorData(modelState.value);
  }, [modelState]);

  const setConfig = React.useCallback(
    (config) =>
      // @ts-ignore
      dispatchModel({
        type: 'compute',
        compute: (v) => ({ ...v, config: _.isFunction(config) ? config(v.config) : config }),
      }),
    [dispatchModel]
  );

  if (isLoading) {
    return <LoadingInfo wrapper message="Loading data" />;
  }
  if (errorMessage) {
    return <ErrorInfo message={errorMessage} />;
  }

  return (
    <>
      <ChartEditor
        data={modelState.value && modelState.value.data}
        config={modelState.value ? modelState.value.config || {} : {}}
        setConfig={setConfig}
      />
      <SaveTabModal
        modalState={saveFileModalState}
        data={modelState.value}
        format="json"
        folder="charts"
        tabid={tabid}
      />
    </>
  );
}
