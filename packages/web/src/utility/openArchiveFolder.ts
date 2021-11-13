import { get } from 'svelte/store';
import getElectron from './getElectron';
import { extensions } from '../stores';
import axiosInstance from '../utility/axiosInstance';

export function openArchiveFolder() {
  const electron = getElectron();
  const ext = get(extensions);
  const filePaths = electron.remote.dialog.showOpenDialogSync(electron.remote.getCurrentWindow(), {
    properties: ['openDirectory'],
  });
  const linkedFolder = filePaths && filePaths[0];
  if (!linkedFolder) return;
  axiosInstance.post('archive/create-link', { linkedFolder });
}
