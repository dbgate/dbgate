import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import axios from '../utility/axios';
import engines from '@dbgate/engines';

import { useConnectionInfo, getTableInfo, getConnectionInfo, getSqlObjectInfo } from '../utility/metadataLoaders';
import SqlEditor from '../sqleditor/SqlEditor';
import { useUpdateDatabaseForTab, useSetOpenedTabs, useOpenedTabs } from '../utility/globalState';
import QueryToolbar from '../query/QueryToolbar';
import SessionMessagesView from '../query/SessionMessagesView';
import { TabPage } from '../widgets/TabControl';
import ResultTabs from '../sqleditor/ResultTabs';
import { VerticalSplitter } from '../widgets/Splitter';
import keycodes from '../utility/keycodes';
import { changeTab } from '../utility/common';
import useSocket from '../utility/SocketProvider';
import SaveSqlFileModal from '../modals/SaveSqlFileModal';
import useModalState from '../modals/useModalState';
import sqlFormatter from 'sql-formatter';
import JavaScriptEditor from '../sqleditor/JavaScriptEditor';

export default function ShellTab({
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
  const localStorageKey = storageKey || `shell_${tabid}`;
  const [shellText, setShellText] = React.useState(() => localStorage.getItem(localStorageKey) || initialScript || '');
  const shellTextRef = React.useRef(shellText);
  const [busy, setBusy] = React.useState(false);

  const saveToStorage = React.useCallback(() => localStorage.setItem(localStorageKey, shellTextRef.current), [
    localStorageKey,
    shellTextRef,
  ]);
  const saveToStorageDebounced = React.useMemo(() => _.debounce(saveToStorage, 5000), [saveToStorage]);
  const setOpenedTabs = useSetOpenedTabs();

  React.useEffect(() => {
    window.addEventListener('beforeunload', saveToStorage);
    return () => {
      saveToStorage();
      window.removeEventListener('beforeunload', saveToStorage);
    };
  }, []);

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
    if (text != null) shellTextRef.current = text;
    setShellText(text);
    saveToStorageDebounced();
  };

  const handleExecute = async () => {};

  const handleCancel = () => {
    // axios.post('sessions/cancel', {
    //   sesid: sessionId,
    // });
  };

  const handleKeyDown = (data, hash, keyString, keyCode, event) => {
    if (keyCode == keycodes.f5) {
      event.preventDefault();
      handleExecute();
    }
  };

  return (
    <>
      <VerticalSplitter>
        <JavaScriptEditor
          value={shellText}
          onChange={handleChange}
          tabVisible={tabVisible}
          onKeyDown={handleKeyDown}
          editorRef={editorRef}
        />
      </VerticalSplitter>
    </>
  );
}
