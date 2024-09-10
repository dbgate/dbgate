import invalidateCommands from '../commands/invalidateCommands';
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
          autoClose: true,
        },
      ],
    });
  });

  electron.addEventListener('app-update-status', (e, value) => {
    appUpdateStatus.set(value);
  });

  electron.addEventListener('downloaded-new-version', (e, version) => {
    showSnackbar({
      message: `New version ${version} downloaded. Update will be installed after app restart.`,
      allowClose: true,
      buttons: [
        {
          label: 'Restart DbGate',
          onClick: () => {
            electron.send('applyUpdate');
          },
          autoClose: true,
        },
      ],
    });
  });

  electron.addEventListener('setAppUpdaterActive', (e, error) => {
    appUpdaterActive.set(true);
    invalidateCommands();
  });
}
