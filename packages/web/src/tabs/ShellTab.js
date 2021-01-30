import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import axios from '../utility/axios';
import { useSetOpenedTabs } from '../utility/globalState';
import { VerticalSplitter } from '../widgets/Splitter';
import keycodes from '../utility/keycodes';
import { changeTab } from '../utility/common';
import useSocket from '../utility/SocketProvider';
import GenericEditor from '../sqleditor/GenericEditor';
import ShellToolbar from '../query/ShellToolbar';
import RunnerOutputPane from '../query/RunnerOutputPane';
import useShowModal from '../modals/showModal';
import ImportExportModal from '../modals/ImportExportModal';
import useEditorData from '../utility/useEditorData';
import SaveTabModal from '../modals/SaveTabModal';
import LoadingInfo from '../widgets/LoadingInfo';
import useTimerLabel from '../utility/useTimerLabel';
import { StatusBarItem } from '../widgets/StatusBar';
import ToolbarPortal from '../utility/ToolbarPortal';

const configRegex = /\s*\/\/\s*@ImportExportConfigurator\s*\n\s*\/\/\s*(\{[^\n]+\})\n/;
const requireRegex = /\s*(\/\/\s*@require\s+[^\n]+)\n/g;
const initRegex = /([^\n]+\/\/\s*@init)/g;

export default function ShellTab({ tabid, tabVisible, toolbarPortalRef, statusbarPortalRef, ...other }) {
  const [busy, setBusy] = React.useState(false);
  const showModal = useShowModal();
  const { editorData, setEditorData, isLoading } = useEditorData({ tabid });
  const timerLabel = useTimerLabel();

  const setOpenedTabs = useSetOpenedTabs();

  const [executeNumber, setExecuteNumber] = React.useState(0);
  const [runnerId, setRunnerId] = React.useState(null);

  const socket = useSocket();

  React.useEffect(() => {
    changeTab(tabid, setOpenedTabs, tab => ({ ...tab, busy }));
  }, [busy]);

  const editorRef = React.useRef(null);

  const handleRunnerDone = React.useCallback(() => {
    setBusy(false);
    timerLabel.stop();
  }, []);

  React.useEffect(() => {
    if (runnerId && socket) {
      socket.on(`runner-done-${runnerId}`, handleRunnerDone);
      return () => {
        socket.off(`runner-done-${runnerId}`, handleRunnerDone);
      };
    }
  }, [runnerId, socket]);

  const handleExecute = async () => {
    if (busy) return;
    setExecuteNumber(num => num + 1);
    const selectedText = editorRef.current.editor.getSelectedText();

    let runid = runnerId;
    const resp = await axios.post('runners/start', {
      script: selectedText
        ? [...(editorData || '').matchAll(requireRegex)].map(x => `${x[1]}\n`).join('') +
          [...(editorData || '').matchAll(initRegex)].map(x => `${x[1]}\n`).join('') +
          selectedText
        : editorData,
    });
    runid = resp.data.runid;
    setRunnerId(runid);
    setBusy(true);
    timerLabel.start();
  };

  const handleCancel = () => {
    axios.post('runners/cancel', {
      runid: runnerId,
    });
    timerLabel.stop();
  };

  const handleKeyDown = (data, hash, keyString, keyCode, event) => {
    if (keyCode == keycodes.f5) {
      event.preventDefault();
      handleExecute();
    }
  };

  const handleEdit = () => {
    const jsonTextMatch = (editorData || '').match(configRegex);
    if (jsonTextMatch) {
      showModal(modalState => (
        <ImportExportModal modalState={modalState} initialValues={JSON.parse(jsonTextMatch[1])} />
      ));
    }
  };

  if (isLoading) {
    return (
      <div>
        <LoadingInfo message="Loading shell script" />
      </div>
    );
  }

  return (
    <>
      <VerticalSplitter>
        <GenericEditor
          value={editorData || ''}
          onChange={setEditorData}
          tabVisible={tabVisible}
          onKeyDown={handleKeyDown}
          editorRef={editorRef}
          mode="javascript"
        />
        <RunnerOutputPane runnerId={runnerId} executeNumber={executeNumber} />
      </VerticalSplitter>
      <ToolbarPortal toolbarPortalRef={toolbarPortalRef} tabVisible={tabVisible}>
        <ShellToolbar
          execute={handleExecute}
          busy={busy}
          cancel={handleCancel}
          edit={handleEdit}
          editAvailable={configRegex.test(editorData || '')}
        />
      </ToolbarPortal>
      {statusbarPortalRef &&
        statusbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(<StatusBarItem>{timerLabel.text}</StatusBarItem>, statusbarPortalRef.current)}
      <SaveTabModal
        toolbarPortalRef={toolbarPortalRef}
        tabVisible={tabVisible}
        data={editorData}
        format="text"
        folder="shell"
        tabid={tabid}
        fileExtension="js"
      />
    </>
  );
}

ShellTab.allowAddToFavorites = props => true;
