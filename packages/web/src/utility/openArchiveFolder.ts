import { get } from 'svelte/store';
import getElectron from './getElectron';
import { currentArchive, extensions, selectedWidget, visibleWidgetSideBar } from '../stores';
import { showSnackbarSuccess } from './snackbar';
import { apiCall } from './api';

export async function openArchiveFolder() {
  const electron = getElectron();
  const ext = get(extensions);
  const filePaths = await electron.showOpenDialog({
    properties: ['openDirectory'],
  });
  const linkedFolder = filePaths && filePaths[0];
  if (!linkedFolder) return;
  const resp = await apiCall('archive/create-link', { linkedFolder });

  currentArchive.set(resp);
  selectedWidget.set('archive');
  visibleWidgetSideBar.set(true);
  showSnackbarSuccess(`Created link ${resp}`);
}
