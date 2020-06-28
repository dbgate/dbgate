import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import axios from '../utility/axios';
import engines from '@dbgate/engines';

import {
  useConnectionInfo,
  getTableInfo,
  getDbCore,
  getConnectionInfo,
  getSqlObjectInfo,
} from '../utility/metadataLoaders';
import SqlEditor from '../sqleditor/SqlEditor';
import { useUpdateDatabaseForTab, useSetOpenedTabs, useOpenedTabs } from '../utility/globalState';
import QueryToolbar from '../query/QueryToolbar';
import SocketMessagesView from '../query/SocketMessagesView';
import { TabPage } from '../widgets/TabControl';
import ResultTabs from '../sqleditor/ResultTabs';
import { VerticalSplitter } from '../widgets/Splitter';
import keycodes from '../utility/keycodes';
import { changeTab } from '../utility/common';
import useSocket from '../utility/SocketProvider';
import SaveSqlFileModal from '../modals/SaveSqlFileModal';
import useModalState from '../modals/useModalState';
import sqlFormatter from 'sql-formatter';

function useSqlTemplate(sqlTemplate, props) {
  const [sql, setSql] = React.useState('');

  async function loadTemplate() {
    if (sqlTemplate == 'CREATE TABLE') {
      const tableInfo = await getDbCore(props, props.objectTypeField || 'tables');
      const connection = await getConnectionInfo(props);
      const driver = engines(connection.engine);
      const dmp = driver.createDumper();
      if (tableInfo) dmp.createTable(tableInfo);
      setSql(dmp.s);
    }
    if (sqlTemplate == 'CREATE OBJECT') {
      const objectInfo = await getSqlObjectInfo(props);
      setSql(objectInfo.createSql);
    }
    if (sqlTemplate == 'EXECUTE PROCEDURE') {
      const procedureInfo = await getSqlObjectInfo(props);
      const connection = await getConnectionInfo(props);

      const driver = engines(connection.engine);
      const dmp = driver.createDumper();
      if (procedureInfo) dmp.put('^execute %f', procedureInfo);
      setSql(dmp.s);
    }
  }

  React.useEffect(() => {
    if (sqlTemplate) {
      loadTemplate();
    }
  }, []);

  return sql;
}

export default function QueryTab({
  tabid,
  conid,
  database,
  initialArgs,
  tabVisible,
  toolbarPortalRef,
  initialScript,
  storageKey,
  ...other
}) {
  const loadingText = 'Loading SQL template...';
  const localStorageKey = storageKey || `sql_${tabid}`;
  const { sqlTemplate } = initialArgs || {};
  const [queryText, setQueryText] = React.useState(
    () => localStorage.getItem(localStorageKey) || initialScript || (sqlTemplate ? loadingText : '')
  );
  const queryTextRef = React.useRef(queryText);
  const [sessionId, setSessionId] = React.useState(null);
  const [executeNumber, setExecuteNumber] = React.useState(0);
  const setOpenedTabs = useSetOpenedTabs();
  const openedTabs = useOpenedTabs();
  const socket = useSocket();
  const [busy, setBusy] = React.useState(false);
  const saveSqlFileModalState = useModalState();

  const sqlFromTemplate = useSqlTemplate(sqlTemplate, { conid, database, ...other });
  React.useEffect(() => {
    if (sqlFromTemplate && queryText == loadingText) {
      editorRef.current.editor.setValue(sqlFromTemplate);
      editorRef.current.editor.clearSelection();
    }
  }, [sqlFromTemplate]);

  const saveToStorage = React.useCallback(() => {
    try {
      localStorage.setItem(localStorageKey, queryTextRef.current);
    } catch (err) {
      console.error(err);
    }
  }, [localStorageKey, queryTextRef]);
  const saveToStorageDebounced = React.useMemo(() => _.debounce(saveToStorage, 5000), [saveToStorage]);

  React.useEffect(() => {
    window.addEventListener('beforeunload', saveToStorage);
    return () => {
      saveToStorage();
      window.removeEventListener('beforeunload', saveToStorage);
    };
  }, []);

  const handleSessionDone = React.useCallback(() => {
    setBusy(false);
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
    if (!storageKey)
      changeTab(tabid, setOpenedTabs, (tab) => ({
        ...tab,
        props: {
          ...tab.props,
          storageKey: localStorageKey,
        },
      }));
  }, [storageKey]);

  React.useEffect(() => {
    changeTab(tabid, setOpenedTabs, (tab) => ({ ...tab, busy }));
  }, [busy]);

  const editorRef = React.useRef(null);

  useUpdateDatabaseForTab(tabVisible, conid, database);
  const connection = useConnectionInfo({ conid });

  const handleChange = (text) => {
    if (text != null) queryTextRef.current = text;
    setQueryText(text);
    saveToStorageDebounced();
  };

  const handleExecute = async () => {
    if (busy) return;
    setExecuteNumber((num) => num + 1);
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
    await axios.post('sessions/execute-query', {
      sesid,
      sql: selectedText || queryText,
    });
  };

  const handleCancel = () => {
    axios.post('sessions/cancel', {
      sesid: sessionId,
    });
  };

  const handleKill = () => {
    axios.post('sessions/cancel', {
      sesid: sessionId,
    });
    setSessionId(null);
  };

  const handleKeyDown = (data, hash, keyString, keyCode, event) => {
    if (keyCode == keycodes.f5) {
      event.preventDefault();
      handleExecute();
    }
  };

  const handleMesageClick = (message) => {
    // console.log('EDITOR', editorRef.current.editor);
    if (editorRef.current && editorRef.current.editor) {
      editorRef.current.editor.gotoLine(message.line);
    }
  };

  const handleFormatCode = () => {
    editorRef.current.editor.setValue(sqlFormatter.format(editorRef.current.editor.getValue()));
    editorRef.current.editor.clearSelection();
  };

  return (
    <>
      <VerticalSplitter>
        <SqlEditor
          value={queryText}
          onChange={handleChange}
          tabVisible={tabVisible}
          engine={connection && connection.engine}
          onKeyDown={handleKeyDown}
          editorRef={editorRef}
          readOnly={queryText == loadingText}
          conid={conid}
          database={database}
        />
        {sessionId && (
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
            cancel={handleCancel}
            format={handleFormatCode}
            save={saveSqlFileModalState.open}
            isConnected={!!sessionId}
            kill={handleKill}
          />,
          toolbarPortalRef.current
        )}
      <SaveSqlFileModal
        modalState={saveSqlFileModalState}
        storageKey={localStorageKey}
        name={openedTabs.find((x) => x.tabid == tabid).title}
        onSave={(name) => changeTab(tabid, setOpenedTabs, (tab) => ({ ...tab, title: name }))}
      />
    </>
  );
}
