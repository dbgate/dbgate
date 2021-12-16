import { get } from 'svelte/store';
import getElectron from './getElectron';
import { currentArchive, extensions, selectedWidget } from '../stores';
import axiosInstance from '../utility/axiosInstance';
import { showSnackbarSuccess } from './snackbar';

export async function openArchiveFolder() {
  const electron = getElectron();
  const ext = get(extensions);
  const filePaths = electron.remote.dialog.showOpenDialogSync(electron.remote.getCurrentWindow(), {
    properties: ['openDirectory'],
  });
  const linkedFolder = filePaths && filePaths[0];
  if (!linkedFolder) return;
  const resp = await axiosInstance().post('archive/create-link', { linkedFolder });

  currentArchive.set(resp.data);
  selectedWidget.set('archive');
  showSnackbarSuccess(`Created link ${resp.data}`);
}
