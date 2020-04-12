import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import axios from '../utility/axios';
import useConnectionInfo from '../utility/useConnectionInfo';
import SqlEditor from '../sqleditor/SqlEditor';
import { useUpdateDatabaseForTab } from '../utility/globalState';
import QueryToolbar from '../query/QueryToolbar';
import SessionMessagesView from '../query/SessionMessagesView';
import { TabPage } from '../widgets/TabControl';
import ResultTabs from '../sqleditor/ResultTabs';
import { VerticalSplitter } from '../widgets/Splitter';
import keycodes from '../utility/keycodes';

// const MainContainer = styled.div``;

// const EditorContainer = styled.div`
//   height: 600px;
//   position: relative;
// `;

// const MessagesContainer = styled.div`
//   height: 200px;
// `;

export default function QueryTab({ tabid, conid, database, tabVisible, toolbarPortalRef }) {
  const localStorageKey = `sql_${tabid}`;
  const [queryText, setQueryText] = React.useState(() => localStorage.getItem(localStorageKey) || '');
  const queryTextRef = React.useRef(queryText);
  const [sessionId, setSessionId] = React.useState(null);
  const [executeNumber, setExecuteNumber] = React.useState(0);

  const saveToStorage = React.useCallback(() => localStorage.setItem(localStorageKey, queryTextRef.current), [
    localStorageKey,
    queryTextRef,
  ]);
  const saveToStorageDebounced = React.useMemo(() => _.debounce(saveToStorage, 5000), [saveToStorage]);

  React.useEffect(() => {
    window.addEventListener('beforeunload', saveToStorage);
    return () => {
      saveToStorage();
      window.removeEventListener('beforeunload', saveToStorage);
    };
  }, []);

  const editorRef = React.useRef(null);

  useUpdateDatabaseForTab(tabVisible, conid, database);
  const connection = useConnectionInfo(conid);

  const handleChange = (text) => {
    if (text != null) queryTextRef.current = text;
    setQueryText(text);
    saveToStorageDebounced();
  };

  const handleExecute = async () => {
    setExecuteNumber((num) => num + 1);
    let sesid = sessionId;
    if (!sesid) {
      const resp = await axios.post('sessions/create', {
        conid,
        database,
      });
      sesid = resp.data.sesid;
      setSessionId(sesid);
    }
    await axios.post('sessions/execute-query', {
      sesid,
      sql: queryText,
    });
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
        />
        <ResultTabs sessionId={sessionId} executeNumber={executeNumber}>
          <TabPage label="Messages" key="messages">
            <SessionMessagesView sessionId={sessionId} onMessageClick={handleMesageClick} executeNumber={executeNumber} />
          </TabPage>
        </ResultTabs>
      </VerticalSplitter>
      {toolbarPortalRef &&
        toolbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(
          <QueryToolbar isDatabaseDefined={conid && database} execute={handleExecute} />,
          toolbarPortalRef.current
        )}
    </>
  );
}
