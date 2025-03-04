import { openedSnackbars } from '../stores';

export interface SnackbarButton {
  label: string;
  onClick: Function;
  autoClose?: boolean;
}

export interface SnackbarInfo {
  message: string;
  progressMessage?: string;
  icon?: string;
  autoClose?: boolean;
  allowClose?: boolean;
  buttons?: SnackbarButton[];
}

let lastSnackbarId = 0;

export function showSnackbar(snackbar: SnackbarInfo): string {
  lastSnackbarId += 1;
  const id = lastSnackbarId.toString();
  openedSnackbars.update(x => [
    ...x,
    {
      ...snackbar,
      id,
    },
  ]);
  return id;
}

export function showSnackbarSuccess(message: string) {
  showSnackbar({
    message,
    icon: 'img ok',
    allowClose: true,
    autoClose: true,
  });
}

export function showSnackbarInfo(message: string) {
  showSnackbar({
    message,
    icon: 'img info',
    allowClose: true,
    autoClose: true,
  });
}

export function showSnackbarError(message: string) {
  showSnackbar({
    message,
    icon: 'img error',
    allowClose: true,
    autoClose: true,
  });
}

export function closeSnackbar(snackId: string) {
  openedSnackbars.update(x => x.filter(x => x.id != snackId));
}

export function updateSnackbarProgressMessage(snackId: string, progressMessage: string) {
  openedSnackbars.update(x => x.map(x => (x.id === snackId ? { ...x, progressMessage } : x)));
}

//   showSnackbar({
//     icon: 'img ok',
//     message: 'Test snackbar',
//     allowClose: true,
//   });
// showSnackbar({
//   icon: 'img ok',
//   message: 'Auto close',
//   autoClose: true,
// });
//   showSnackbar({
//     icon: 'img warn',
//     message: 'Buttons',
//     buttons: [{ label: 'OK', onClick: () => console.log('OK') }],
//   });
