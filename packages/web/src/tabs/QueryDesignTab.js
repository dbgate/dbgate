import React from 'react';
import _ from 'lodash';
import ReactDOM from 'react-dom';
import axios from '../utility/axios';

import { useConnectionInfo } from '../utility/metadataLoaders';
import SqlEditor from '../sqleditor/SqlEditor';
import { useUpdateDatabaseForTab, useSetOpenedTabs } from '../utility/globalState';
import QueryDesignToolbar from '../designer/QueryDesignToolbar';
import SocketMessagesView from '../query/SocketMessagesView';
import { TabPage } from '../widgets/TabControl';
import ResultTabs from '../sqleditor/ResultTabs';
import { VerticalSplitter } from '../widgets/Splitter';
import keycodes from '../utility/keycodes';
import { changeTab } from '../utility/common';
import useSocket from '../utility/SocketProvider';
import SaveTabModal from '../modals/SaveTabModal';
import useModalState from '../modals/useModalState';
import sqlFormatter from 'sql-formatter';
import useEditorData from '../utility/useEditorData';
import LoadingInfo from '../widgets/LoadingInfo';
import useExtensions from '../utility/useExtensions';
import QueryDesigner from '../designer/QueryDesigner';
import QueryDesignColumns from '../designer/QueryDesignColumns';
import { findEngineDriver } from 'dbgate-tools';
import { generateDesignedQuery } from '../designer/designerTools';
import useUndoReducer from '../utility/useUndoReducer';
import { StatusBarItem } from '../widgets/StatusBar';
import useTimerLabel from '../utility/useTimerLabel';

export default function QueryDesignTab({
  tabid,
  conid,
  database,
  tabVisible,
  toolbarPortalRef,
  statusbarPortalRef,
  ...other
}) {
  const [sessionId, setSessionId] = React.useState(null);
  const [visibleResultTabs, setVisibleResultTabs] = React.useState(false);
  const [executeNumber, setExecuteNumber] = React.useState(0);
  const setOpenedTabs = useSetOpenedTabs();
  const socket = useSocket();
  const [busy, setBusy] = React.useState(false);
  const saveFileModalState = useModalState();
  const extensions = useExtensions();
  const connection = useConnectionInfo({ conid });
  const engine = findEngineDriver(connection, extensions);
  const [sqlPreview, setSqlPreview] = React.useState('');
  const { initialData, setEditorData, isLoading } = useEditorData({
    tabid,
  });
  const [modelState, dispatchModel] = useUndoReducer(
    {
      tables: [],
      references: [],
      columns: [],
    },
    { mergeNearActions: true }
  );
  const timerLabel = useTimerLabel();

  React.useEffect(() => {
    // @ts-ignore
    if (initialData) dispatchModel({ type: 'reset', value: initialData });
  }, [initialData]);

  React.useEffect(() => {
    setEditorData(modelState.value);
  }, [modelState]);

  const handleSessionDone = React.useCallback(() => {
    setBusy(false);
    timerLabel.stop();
  }, []);

  const generatePreview = (value, engine) => {
    if (!engine || !value) return;
    const sql = generateDesignedQuery(value, engine);
    setSqlPreview(sqlFormatter.format(sql));
  };

  React.useEffect(() => {
    generatePreview(modelState.value, engine);
  }, [modelState.value, engine]);

  const handleChange = React.useCallback(
    (value, skipUndoChain) =>
      // @ts-ignore
      dispatchModel({
        type: 'compute',
        useMerge: skipUndoChain,
        compute: v => (_.isFunction(value) ? value(v) : value),
      }),
    [dispatchModel]
  );

  React.useEffect(() => {
    if (sessionId && socket) {
      socket.on(`session-done-${sessionId}`, handleSessionDone);
      return () => {
        socket.off(`session-done-${sessionId}`, handleSessionDone);
      };
    }
  }, [sessionId, socket]);

  React.useEffect(() => {
    changeTab(tabid, setOpenedTabs, tab => ({ ...tab, busy }));
  }, [busy]);

  useUpdateDatabaseForTab(tabVisible, conid, database);

  const handleExecute = React.useCallback(async () => {
    if (busy) return;
    setExecuteNumber(num => num + 1);
    setVisibleResultTabs(true);

    let sesid = sessionId;
    if (!sesid) {
      const resp = await axios.post('sessions/create', {
        conid,
        database,
      });
      sesid = resp.data.sesid;
      setSessionId(sesid);
    }
    setBusy(true);
    timerLabel.start();
    await axios.post('sessions/execute-query', {
      sesid,
      sql: sqlPreview,
    });
  }, [busy, conid, sessionId, database, sqlPreview]);

  const handleKill = async () => {
    await axios.post('sessions/kill', {
      sesid: sessionId,
    });
    setSessionId(null);
    setBusy(false);
    timerLabel.stop();
  };

  const handleKeyDown = React.useCallback(
    e => {
      if (e.keyCode == keycodes.f5) {
        e.preventDefault();
        handleExecute();
      }
    },
    [handleExecute]
  );

  React.useEffect(() => {
    if (tabVisible) {
      document.addEventListener('keydown', handleKeyDown, false);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [tabVisible, handleKeyDown]);

  if (isLoading) {
    return (
      <div>
        <LoadingInfo message="Loading SQL script" />
      </div>
    );
  }

  return (
    <>
      <VerticalSplitter initialValue="70%">
        <QueryDesigner
          value={modelState.value || {}}
          conid={conid}
          database={database}
          engine={connection && connection.engine}
          onChange={handleChange}
        ></QueryDesigner>
        <ResultTabs sessionId={sessionId} executeNumber={executeNumber}>
          <TabPage label="Columns" key="columns">
            <QueryDesignColumns value={modelState.value || {}} onChange={handleChange} />
          </TabPage>
          <TabPage label="SQL" key="sql">
            <SqlEditor value={sqlPreview} engine={engine} readOnly />
          </TabPage>
          {visibleResultTabs && (
            <TabPage label="Messages" key="messages">
              <SocketMessagesView
                eventName={sessionId ? `session-info-${sessionId}` : null}
                executeNumber={executeNumber}
              />
            </TabPage>
          )}
        </ResultTabs>
      </VerticalSplitter>
      {toolbarPortalRef &&
        toolbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(
          <QueryDesignToolbar
            modelState={modelState}
            dispatchModel={dispatchModel}
            isDatabaseDefined={conid && database}
            execute={handleExecute}
            busy={busy}
            // cancel={handleCancel}
            // format={handleFormatCode}
            save={saveFileModalState.open}
            isConnected={!!sessionId}
            kill={handleKill}
          />,
          toolbarPortalRef.current
        )}
      {statusbarPortalRef &&
        statusbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(<StatusBarItem>{timerLabel.text}</StatusBarItem>, statusbarPortalRef.current)}
      <SaveTabModal
        modalState={saveFileModalState}
        tabVisible={tabVisible}
        data={modelState.value}
        format="json"
        folder="query"
        tabid={tabid}
      />
    </>
  );
}

QueryDesignTab.allowAddToFavorites = props => true;
