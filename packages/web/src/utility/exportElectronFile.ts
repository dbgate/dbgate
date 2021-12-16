import ScriptWriter from '../impexp/ScriptWriter';
import getElectron from './getElectron';
import axiosInstance from '../utility/axiosInstance';
import socket from '../utility/socket';
import { showSnackbar, showSnackbarInfo, showSnackbarError, closeSnackbar } from '../utility/snackbar';
import resolveApi from './resolveApi';

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

  const resp = await axiosInstance().post('runners/start', { script: script.getScript() });
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
          axiosInstance().post('runners/cancel', { runid });
        },
      },
    ],
  });

  function handleRunnerDone() {
    closeSnackbar(snackId);
    socket().off(`runner-done-${runid}`, handleRunnerDone);
    if (isCanceled) showSnackbarError(`Export ${dataName} canceled`);
    else showSnackbarInfo(`Export ${dataName} finished`);
  }

  socket().on(`runner-done-${runid}`, handleRunnerDone);
}

export async function saveFileToDisk(
  filePathFunc,
  options: any = { formatLabel: 'HTML page', formatExtension: 'html' }
) {
  const { formatLabel, formatExtension } = options;
  const electron = getElectron();

  if (electron) {
    const filters = [{ name: formatLabel, extensions: [formatExtension] }];
    const filePath = electron.remote.dialog.showSaveDialogSync(electron.remote.getCurrentWindow(), {
      filters,
      defaultPath: `file.${formatExtension}`,
      properties: ['showOverwriteConfirmation'],
    });
    if (!filePath) return;
    await filePathFunc(filePath);
    electron.shell.openExternal('file:///' + filePath);
  } else {
    const resp = await axiosInstance().get('files/generate-uploads-file');
    await filePathFunc(resp.data.filePath);
    window.open(`${resolveApi()}/uploads/get?file=${resp.data.fileName}`, '_blank');
  }
}
