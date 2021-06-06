import ScriptWriter from '../impexp/ScriptWriter';
import getElectron from './getElectron';
import axiosInstance from '../utility/axiosInstance';
import socket from '../utility/socket';
import { showSnackbar, showSnackbarInfo, showSnackbarError, closeSnackbar } from '../utility/snackbar';

export async function exportElectronFile(dataName, reader, format) {
  const electron = getElectron();
  const filters = [{ name: format.label, extensions: [format.extension] }];

  const filePath = electron.remote.dialog.showSaveDialogSync(electron.remote.getCurrentWindow(), {
    filters,
    defaultPath: `${dataName}.${format.extension}`,
    properties: ['showOverwriteConfirmation'],
  });
  if (!filePath) return;

  const script = new ScriptWriter();

  const sourceVar = script.allocVariable();
  script.assign(sourceVar, reader.functionName, reader.props);

  const targetVar = script.allocVariable();
  const writer = format.createWriter(filePath, dataName);
  script.assign(targetVar, writer.functionName, writer.props);

  script.copyStream(sourceVar, targetVar);
  script.put();

  const resp = await axiosInstance.post('runners/start', { script: script.getScript() });
  const runid = resp.data.runid;
  let isCanceled = false;

  const snackId = showSnackbar({
    message: `Exporting ${dataName}`,
    icon: 'icon loading',
    buttons: [
      {
        label: 'Cancel',
        onClick: () => {
          isCanceled = true;
          axiosInstance.post('runners/cancel', { runid });
        },
      },
    ],
  });

  function handleRunnerDone() {
    closeSnackbar(snackId);
    socket.off(`runner-done-${runid}`, handleRunnerDone);
    if (isCanceled) showSnackbarError(`Export ${dataName} canceled`);
    else showSnackbarInfo(`Export ${dataName} finished`);
  }

  socket.on(`runner-done-${runid}`, handleRunnerDone);
}
