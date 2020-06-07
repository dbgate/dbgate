import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import axios from '../utility/axios';
import engines from '@dbgate/engines';

import { useConnectionInfo, getTableInfo, getConnectionInfo, getSqlObjectInfo } from '../utility/metadataLoaders';
import SqlEditor from '../sqleditor/SqlEditor';
import { useUpdateDatabaseForTab, useSetOpenedTabs, useOpenedTabs } from '../utility/globalState';
import QueryToolbar from '../query/QueryToolbar';
import SocketMessagesView from '../query/SocketMessagesView';
import { TabPage } from '../widgets/TabControl';
import ResultTabs from '../sqleditor/ResultTabs';
import { VerticalSplitter, HorizontalSplitter } from '../widgets/Splitter';
import keycodes from '../utility/keycodes';
import { changeTab } from '../utility/common';
import useSocket from '../utility/SocketProvider';
import SaveSqlFileModal from '../modals/SaveSqlFileModal';
import useModalState from '../modals/useModalState';
import sqlFormatter from 'sql-formatter';
import JavaScriptEditor from '../sqleditor/JavaScriptEditor';
import ShellToolbar from '../query/ShellToolbar';
import RunnerOutputPane from '../query/RunnerOutputPane';

export default function ShellTab({
  tabid,
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

  const [executeNumber, setExecuteNumber] = React.useState(0);
  const [runnerId, setRunnerId] = React.useState(null);

  const socket = useSocket();

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

  const handleRunnerDone = React.useCallback(() => {
    setBusy(false);
  }, []);

  React.useEffect(() => {
    if (runnerId && socket) {
      socket.on(`runner-done-${runnerId}`, handleRunnerDone);
      return () => {
        socket.off(`runner-done-${runnerId}`, handleRunnerDone);
      };
    }
  }, [runnerId, socket]);

  const handleChange = (text) => {
    if (text != null) shellTextRef.current = text;
    setShellText(text);
    saveToStorageDebounced();
  };

  const handleExecute = async () => {
    if (busy) return;
    setExecuteNumber((num) => num + 1);
    const selectedText = editorRef.current.editor.getSelectedText();

    let runid = runnerId;
    const resp = await axios.post('runners/start', {
      script: selectedText || shellText,
    });
    runid = resp.data.runid;
    setRunnerId(runid);
    setBusy(true);
  };

  const handleCancel = () => {
    axios.post('runners/cancel', {
      runid: runnerId,
    });
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
        <RunnerOutputPane runnerId={runnerId} executeNumber={executeNumber}/>
      </VerticalSplitter>
      {toolbarPortalRef &&
        toolbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(
          <ShellToolbar execute={handleExecute} busy={busy} cancel={handleCancel} />,
          toolbarPortalRef.current
        )}
    </>
  );
}
