import { showModal } from '../modals/modalTools';
import { get } from 'svelte/store';
import newQuery from '../query/newQuery';
import ImportExportModal from '../modals/ImportExportModal.svelte';
import getElectron from './getElectron';
import { currentDatabase, extensions } from '../stores';
import { getUploadListener } from './uploadFiles';
import axiosInstance from '../utility/axiosInstance';
import { getDatabaseFileLabel } from './getConnectionLabel';

function getFileFormatFilters(extensions) {
  return extensions.quickExports.map(x => ({ name: x.label, extensions: [x.extension] }));
}

export async function exportElectronFile() {
  const electron = getElectron();
  const ext = get(extensions);
  const filters = getFileFormatFilters(ext);
  console.log('FLT', filters);
  electron.remote.dialog
    .showSaveDialog(electron.remote.getCurrentWindow(), {
      filters,
    })
    .then(filePaths => {
      console.log('filePaths ASYNC2', filePaths);
      const filePath = filePaths && filePaths[0];
      console.log('filePath', filePath);
    });
}
