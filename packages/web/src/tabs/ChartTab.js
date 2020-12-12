import React from 'react';
import _ from 'lodash';
import { createFreeTableModel } from 'dbgate-datalib';
import useUndoReducer from '../utility/useUndoReducer';
import ReactDOM from 'react-dom';
import { useUpdateDatabaseForTab } from '../utility/globalState';
import useModalState from '../modals/useModalState';
import LoadingInfo from '../widgets/LoadingInfo';
import ErrorInfo from '../widgets/ErrorInfo';
import useEditorData from '../utility/useEditorData';
import SaveTabModal from '../modals/SaveTabModal';
import ChartEditor from '../charts/ChartEditor';
import ChartToolbar from '../charts/ChartToolbar';

export default function ChartTab({ tabVisible, toolbarPortalRef, conid, database, tabid }) {
  const [modelState, dispatchModel] = useUndoReducer(createFreeTableModel());
  const saveFileModalState = useModalState();
  const { initialData, setEditorData, errorMessage, isLoading } = useEditorData({
    tabid,
  });
  useUpdateDatabaseForTab(tabVisible, conid, database);

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
        sql={modelState.value && modelState.value.sql}
        conid={conid}
        database={database}
      />
      <SaveTabModal
        modalState={saveFileModalState}
        tabVisible={tabVisible}
        data={modelState.value}
        format="json"
        folder="charts"
        tabid={tabid}
      />
      {toolbarPortalRef &&
        toolbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(
          <ChartToolbar save={saveFileModalState.open} modelState={modelState} dispatchModel={dispatchModel} />,
          toolbarPortalRef.current
        )}
    </>
  );
}
