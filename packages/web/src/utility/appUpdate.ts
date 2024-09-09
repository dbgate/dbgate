import { appUpdaterActive, appUpdateStatus } from '../stores';
import getElectron from './getElectron';
import { showSnackbar } from './snackbar';

export function initializeAppUpdates() {
  const electron = getElectron();
  if (!electron) {
    return;
  }

  electron.addEventListener('update-available', (e, version) => {
    showSnackbar({
      message: `Update available: ${version}`,
      allowClose: true,
      buttons: [
        {
          label: 'Download',
          onClick: () => {
            electron.send('downloadUpdate');
          },
        },
      ],
    });
  });

  electron.addEventListener('app-update-status', (e, text) => {
    appUpdateStatus.set(text);
  });

  electron.addEventListener('downloaded-new-version', (e, version) => {
    showSnackbar({
      message: `New version ${version} downloaded`,
      allowClose: true,
      buttons: [
        {
          label: 'Restart',
          onClick: () => {
            electron.send('applyUpdate');
          },
        },
      ],
    });
  });

  electron.addEventListener('setAppUpdaterActive', (e, error) => {
    appUpdaterActive.set(true);
  });
}
