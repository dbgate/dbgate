import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import axios from '../utility/axios';
import engines from '@dbgate/engines';
import useTableInfo from '../utility/useTableInfo';
import useConnectionInfo from '../utility/useConnectionInfo';
import SqlEditor from '../sqleditor/SqlEditor';
import { useUpdateDatabaseForTab } from '../utility/globalState';
import QueryToolbar from '../query/QueryToolbar';
import styled from 'styled-components';
import SessionMessagesView from '../query/SessionMessagesView';
import { TabPage, TabControl } from '../widgets/TabControl';
import getResultTabs from '../sqleditor/ResultTabs';
import ResultTabs from '../sqleditor/ResultTabs';

const MainContainer = styled.div``;

const EditorContainer = styled.div`
  height: 600px;
  position: relative;
`;

const MessagesContainer = styled.div`
  height: 200px;
`;

export default function QueryTab({ tabid, conid, database, tabVisible, toolbarPortalRef }) {
  const localStorageKey = `sql_${tabid}`;
  const [queryText, setQueryText] = React.useState(() => localStorage.getItem(localStorageKey) || '');
  const queryTextRef = React.useRef(queryText);
  const [sessionId, setSessionId] = React.useState(null);

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

  useUpdateDatabaseForTab(tabVisible, conid, database);
  const connection = useConnectionInfo(conid);

  const handleChange = (text) => {
    if (text != null) queryTextRef.current = text;
    setQueryText(text);
    saveToStorageDebounced();
  };

  const handleExecute = async () => {
    let sesid = sessionId;
    if (!sesid) {
      const resp = await axios.post('sessions/create', {
        conid,
        database,
      });
      sesid = resp.data.sesid;
      setSessionId(sesid);
    }
    const resp2 = await axios.post('sessions/execute-query', {
      sesid,
      sql: queryText,
    });
  };

  const handleKeyDown = (e) => {};

  return (
    <MainContainer>
      <EditorContainer>
        <SqlEditor
          value={queryText}
          onChange={handleChange}
          tabVisible={tabVisible}
          engine={connection && connection.engine}
          onKeyDown={handleKeyDown}
        />

        {toolbarPortalRef &&
          toolbarPortalRef.current &&
          tabVisible &&
          ReactDOM.createPortal(
            <QueryToolbar isDatabaseDefined={conid && database} execute={handleExecute} />,
            toolbarPortalRef.current
          )}
      </EditorContainer>
      <MessagesContainer>
        <ResultTabs sessionId={sessionId}>
          <TabPage label="Messages">
            <SessionMessagesView sessionId={sessionId} />
          </TabPage>
        </ResultTabs>
      </MessagesContainer>
    </MainContainer>
  );
}
