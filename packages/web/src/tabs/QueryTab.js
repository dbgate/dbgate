import React from 'react';
import _ from 'lodash';
import ReactDOM from 'react-dom';
import axios from '../utility/axios';

import { useConnectionInfo } from '../utility/metadataLoaders';
import SqlEditor from '../sqleditor/SqlEditor';
import { useUpdateDatabaseForTab, useSetOpenedTabs } from '../utility/globalState';
import QueryToolbar from '../query/QueryToolbar';
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
import applySqlTemplate from '../utility/applySqlTemplate';
import LoadingInfo from '../widgets/LoadingInfo';
import useExtensions from '../utility/useExtensions';
import useTimerLabel from '../utility/useTimerLabel';
import { StatusBarItem } from '../widgets/StatusBar';

function createSqlPreview(sql) {
  if (!sql) return undefined;
  let data = sql.substring(0, 500);
  data = data.replace(/\[[^\]]+\]\./g, '');
  data = data.replace(/\[a-zA-Z0-9_]+\./g, '');
  data = data.replace(/\/\*.*\*\//g, '');
  data = data.replace(/[\[\]]/g, '');
  data = data.replace(/--[^\n]*\n/g, '');

  for (let step = 1; step <= 5; step++) {
    data = data.replace(/\([^\(^\)]+\)/g, '');
  }
  data = data.replace(/\s+/g, ' ');
  data = data.trim();
  data = data.replace(/^(.{50}[^\s]*).*/, '$1');
  return data;
}

export default function QueryTab({
  tabid,
  conid,
  database,
  initialArgs,
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
  const timerLabel = useTimerLabel();
  const { editorData, setEditorData, isLoading } = useEditorData({
    tabid,
    loadFromArgs:
      initialArgs && initialArgs.sqlTemplate
        ? () => applySqlTemplate(initialArgs.sqlTemplate, extensions, { conid, database, ...other })
        : null,
  });

  const editorRef = React.useRef(null);

  const handleSessionDone = React.useCallback(() => {
    setBusy(false);
    timerLabel.stop();
  }, []);

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
  const connection = useConnectionInfo({ conid });

  const updateContentPreviewDebounced = React.useRef(
    _.debounce(
      // @ts-ignore
      sql =>
        changeTab(tabid, setOpenedTabs, tab => ({
          ...tab,
          contentPreview: createSqlPreview(sql),
        })),
      500
    )
  );

  React.useEffect(() => {
    // @ts-ignore
    updateContentPreviewDebounced.current(editorData);
  }, [editorData]);

  const handleExecute = async () => {
    if (busy) return;
    setExecuteNumber(num => num + 1);
    setVisibleResultTabs(true);
    const selectedText = editorRef.current.editor.getSelectedText();

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
      sql: selectedText || editorData,
    });
  };

  // const handleCancel = () => {
  //   axios.post('sessions/cancel', {
  //     sesid: sessionId,
  //   });
  // };

  const handleKill = async () => {
    await axios.post('sessions/kill', {
      sesid: sessionId,
    });
    setSessionId(null);
    setBusy(false);
    timerLabel.stop();
  };

  const handleKeyDown = (data, hash, keyString, keyCode, event) => {
    if (keyCode == keycodes.f5) {
      event.preventDefault();
      handleExecute();
    }
  };

  const handleMesageClick = message => {
    // console.log('EDITOR', editorRef.current.editor);
    if (editorRef.current && editorRef.current.editor) {
      editorRef.current.editor.gotoLine(message.line);
    }
  };

  const handleFormatCode = () => {
    editorRef.current.editor.setValue(sqlFormatter.format(editorRef.current.editor.getValue()));
    editorRef.current.editor.clearSelection();
  };

  if (isLoading) {
    return (
      <div>
        <LoadingInfo message="Loading SQL script" />
      </div>
    );
  }

  return (
    <>
      <VerticalSplitter>
        <SqlEditor
          value={editorData || ''}
          onChange={setEditorData}
          tabVisible={tabVisible}
          engine={connection && connection.engine}
          onKeyDown={handleKeyDown}
          editorRef={editorRef}
          conid={conid}
          database={database}
        />
        {visibleResultTabs && (
          <ResultTabs sessionId={sessionId} executeNumber={executeNumber}>
            <TabPage label="Messages" key="messages">
              <SocketMessagesView
                eventName={sessionId ? `session-info-${sessionId}` : null}
                onMessageClick={handleMesageClick}
                executeNumber={executeNumber}
                showProcedure
                showLine
              />
            </TabPage>
          </ResultTabs>
        )}
      </VerticalSplitter>
      {toolbarPortalRef &&
        toolbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(
          <QueryToolbar
            isDatabaseDefined={conid && database}
            execute={handleExecute}
            busy={busy}
            // cancel={handleCancel}
            format={handleFormatCode}
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
        data={editorData}
        format="text"
        folder="sql"
        tabid={tabid}
        fileExtension='sql'
      />
    </>
  );
}

QueryTab.allowAddToFavorites = props => true;
