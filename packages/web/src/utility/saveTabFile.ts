import { derived, get } from 'svelte/store';
import { showModal } from '../modals/modalTools';
import { openedTabs } from '../stores';
import axiosInstance from '../utility/axiosInstance';
import { changeTab } from './common';
import SaveFileModal from '../modals/SaveFileModal.svelte';
import registerCommand from '../commands/registerCommand';

// export function saveTabEnabledStore(editorStore) {
//   return derived(editorStore, editor => editor != null);
// }

export default function saveTabFile(editor, saveAs, folder, format, fileExtension) {
  const tabs = get(openedTabs);
  const tabid = editor.activator.tabid;
  const data = editor.getData();
  const { savedFile, savedFilePath, savedFolder } = tabs.find(x => x.tabid == tabid).props || {};

  const handleSave = async () => {
    if (savedFile) {
      await axiosInstance().post('files/save', { folder: savedFolder || folder, file: savedFile, data, format });
    }
    if (savedFilePath) {
      await axiosInstance().post('files/save-as', { filePath: savedFilePath, data, format });
    }
  };

  const onSave = (title, newProps) => {
    changeTab(tabid, tab => ({
      ...tab,
      title,
      props: {
        ...tab.props,
        savedFormat: format,
        ...newProps,
      },
    }));
  };

  if ((savedFile || savedFilePath) && !saveAs) {
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
