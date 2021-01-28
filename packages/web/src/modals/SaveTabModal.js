import React from 'react';
import { changeTab } from '../utility/common';
import { useOpenedTabs, useSetOpenedTabs } from '../utility/globalState';
import keycodes from '../utility/keycodes';
import SaveFileModal from './SaveFileModal';

export default function SaveTabModal({ data, folder, format, modalState, tabid, tabVisible, fileExtension }) {
  const setOpenedTabs = useSetOpenedTabs();
  const openedTabs = useOpenedTabs();

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

  const handleKeyboard = React.useCallback(
    e => {
      if (e.keyCode == keycodes.s && e.ctrlKey) {
        e.preventDefault();
        modalState.open();
      }
    },
    [modalState]
  );

  React.useEffect(() => {
    if (tabVisible) {
      document.addEventListener('keydown', handleKeyboard);
      return () => {
        document.removeEventListener('keydown', handleKeyboard);
      };
    }
  }, [tabVisible, handleKeyboard]);

  return (
    <SaveFileModal
      data={data}
      folder={folder}
      format={format}
      modalState={modalState}
      name={savedFile || 'newFile'}
      filePath={savedFilePath}
      fileExtension={fileExtension}
      onSave={onSave}
    />
  );
}
