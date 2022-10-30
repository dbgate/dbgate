import { derived, get } from 'svelte/store';
import { showModal } from '../modals/modalTools';
import { openedTabs } from '../stores';
import { changeTab, markTabSaved } from './common';
import SaveFileModal from '../modals/SaveFileModal.svelte';
import registerCommand from '../commands/registerCommand';
import { apiCall } from './api';
import getElectron from './getElectron';

// export function saveTabEnabledStore(editorStore) {
//   return derived(editorStore, editor => editor != null);
// }

export default async function saveTabFile(editor, saveMode, folder, format, fileExtension) {
  const tabs = get(openedTabs);
  const tabid = editor.activator.tabid;
  const data = editor.getData();
  const { savedFile, savedFilePath, savedFolder } = tabs.find(x => x.tabid == tabid).props || {};

  const handleSave = async () => {
    if (savedFile) {
      await apiCall('files/save', { folder: savedFolder || folder, file: savedFile, data, format });
    }
    if (savedFilePath) {
      await apiCall('files/save-as', { filePath: savedFilePath, data, format });
    }
    markTabSaved(tabid);
  };

  const onSave = (title, newProps) => {
    changeTab(tabid, tab => ({
      ...tab,
      title,
      unsaved: false,
      props: {
        ...tab.props,
        savedFormat: format,
        ...newProps,
      },
    }));
  };

  if (saveMode == 'save-to-disk') {
    const electron = getElectron();
    const file = await electron.showSaveDialog({
      filters: [
        { name: `${fileExtension.toUpperCase()} files`, extensions: [fileExtension] },
        { name: `All files`, extensions: ['*'] },
      ],
      defaultPath: savedFilePath || `file.${fileExtension}`,
      properties: ['showOverwriteConfirmation'],
    });
    if (file) {
      await apiCall('files/save-as', { filePath: file, data, format });

      const path = window.require('path');
      const parsed = path.parse(file);

      onSave(parsed.name, {
        savedFile: null,
        savedFolder: null,
        savedFilePath: file,
      });
    }
  } else if ((savedFile || savedFilePath) && saveMode == 'save') {
    handleSave();
  } else {
    showModal(SaveFileModal, {
      data,
      folder,
      format,
      fileExtension,
      name: savedFile || 'newFile',
      filePath: savedFilePath,
      onSave,
    });
  }
}
