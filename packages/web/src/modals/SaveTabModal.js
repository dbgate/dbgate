import React from 'react';
import axios from '../utility/axios';
import { changeTab } from '../utility/common';
import getElectron from '../utility/getElectron';
import { useOpenedTabs, useSetOpenedTabs } from '../utility/globalState';
import keycodes from '../utility/keycodes';
import SaveFileToolbarButton from '../utility/SaveFileToolbarButton';
import ToolbarPortal from '../utility/ToolbarPortal';
import useHasPermission from '../utility/useHasPermission';
import SaveFileModal from './SaveFileModal';
import useModalState from './useModalState';

export default function SaveTabModal({
  data,
  folder,
  format,
  tabid,
  tabVisible,
  fileExtension,
  toolbarPortalRef = undefined,
}) {
  const setOpenedTabs = useSetOpenedTabs();
  const openedTabs = useOpenedTabs();
  const saveFileModalState = useModalState();
  const hasPermission = useHasPermission();
  const canSave = hasPermission(`files/${folder}/write`);

  const { savedFile, savedFilePath } = openedTabs.find(x => x.tabid == tabid).props || {};
  const onSave = (title, newProps) => {
    changeTab(tabid, setOpenedTabs, tab => ({
      ...tab,
      title,
      props: {
        ...tab.props,
        savedFormat: format,
        ...newProps,
      },
    }));
  };

  const handleSave = async () => {
    if (savedFile) {
      await axios.post('files/save', { folder, file: savedFile, data, format });
    }
    if (savedFilePath) {
      await axios.post('files/save-as', { filePath: savedFilePath, data, format });
    }
  };
  const handleSaveRef = React.useRef(handleSave);
  handleSaveRef.current = handleSave;

  const handleKeyboard = React.useCallback(
    e => {
      if (e.keyCode == keycodes.s && e.ctrlKey) {
        e.preventDefault();
        if (e.shiftKey) {
          saveFileModalState.open();
        } else {
          if (savedFile || savedFilePath) handleSaveRef.current();
          else saveFileModalState.open();
        }
      }
    },
    [saveFileModalState]
  );

  React.useEffect(() => {
    if (tabVisible && canSave) {
      document.addEventListener('keydown', handleKeyboard);
      return () => {
        document.removeEventListener('keydown', handleKeyboard);
      };
    }
  }, [tabVisible, handleKeyboard, canSave]);

  React.useEffect(() => {
    const electron = getElectron();
    if (electron) {
      const { ipcRenderer } = electron;
      window['dbgate_tabExports'][tabid] = {
        save: handleSaveRef.current,
        saveAs: saveFileModalState.open,
      };
      ipcRenderer.send('update-menu');

      return () => {
        delete window['dbgate_tabExports'][tabid];
        ipcRenderer.send('update-menu');
      };
    }
  }, []);

  return (
    <>
      <SaveFileModal
        data={data}
        folder={folder}
        format={format}
        modalState={saveFileModalState}
        name={savedFile || 'newFile'}
        filePath={savedFilePath}
        fileExtension={fileExtension}
        onSave={onSave}
      />

      {canSave && (
        <ToolbarPortal tabVisible={tabVisible} toolbarPortalRef={toolbarPortalRef}>
          <SaveFileToolbarButton
            saveAs={saveFileModalState.open}
            save={savedFile || savedFilePath ? handleSave : null}
            tabid={tabid}
          />
        </ToolbarPortal>
      )}
    </>
  );
}
