import ScriptWriter from '../impexp/ScriptWriter';
import getElectron from './getElectron';
import socket from '../utility/socket';
import { showSnackbar, showSnackbarInfo, showSnackbarError, closeSnackbar } from '../utility/snackbar';
import resolveApi from './resolveApi';
import { apiCall } from './api';

export async function exportElectronFile(dataName, reader, format) {
  const electron = getElectron();
  const filters = [{ name: format.label, extensions: [format.extension] }];

  const filePath = await electron.showSaveDialog({
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

  const resp = await apiCall('runners/start', { script: script.getScript() });
  const runid = resp.runid;
  let isCanceled = false;

  const snackId = showSnackbar({
    message: `Exporting ${dataName}`,
    icon: 'icon loading',
    buttons: [
      {
        label: 'Cancel',
        onClick: () => {
          isCanceled = true;
          apiCall('runners/cancel', { runid });
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
    const filePath = await electron.showSaveDialog({
      filters,
      defaultPath: `file.${formatExtension}`,
      properties: ['showOverwriteConfirmation'],
    });
    if (!filePath) return;
    await filePathFunc(filePath);
    electron.openExternal('file:///' + filePath);
  } else {
    const resp = await apiCall('files/generate-uploads-file');
    await filePathFunc(resp.filePath);
    window.open(`${resolveApi()}/uploads/get?file=${resp.fileName}`, '_blank');
  }
}
