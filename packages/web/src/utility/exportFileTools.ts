import { ScriptWriter, ScriptWriterJson } from 'dbgate-tools';
import getElectron from './getElectron';
import { showSnackbar, showSnackbarInfo, showSnackbarError, closeSnackbar } from '../utility/snackbar';
import resolveApi from './resolveApi';
import { apiCall, apiOff, apiOn } from './api';
import { normalizeExportColumnMap } from '../impexp/createImpExpScript';
import { getCurrentConfig } from '../stores';

export async function saveExportedFile(filters, defaultPath, extension, dataName, getScript: (filaPath: string) => {}) {
  const electron = getElectron();

  let filePath;
  let pureFileName;
  if (electron) {
    filePath = await electron.showSaveDialog({
      filters,
      defaultPath,
      properties: ['showOverwriteConfirmation'],
    });
  } else {
    const resp = await apiCall('files/generate-uploads-file', { extension });
    filePath = resp.filePath;
    pureFileName = resp.fileName;
  }

  if (!filePath) return;

  const script = getScript(filePath);

  const resp = await apiCall('runners/start', { script });
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
    apiOff(`runner-done-${runid}`, handleRunnerDone);
    if (isCanceled) showSnackbarError(`Export ${dataName} canceled`);
    else showSnackbarInfo(`Export ${dataName} finished`);

    if (!electron) {
      window.open(`${resolveApi()}/uploads/get?file=${pureFileName}`, '_blank');
    }
  }

  apiOn(`runner-done-${runid}`, handleRunnerDone);
}

export async function exportQuickExportFile(dataName, reader, format, columnMap = null) {
  await saveExportedFile(
    [{ name: format.label, extensions: [format.extension] }],
    `${dataName}.${format.extension}`,
    format.extension,
    dataName,
    filePath => {
      const script = getCurrentConfig().allowShellScripting ? new ScriptWriter() : new ScriptWriterJson();

      const sourceVar = script.allocVariable();
      script.assign(sourceVar, reader.functionName, reader.props);

      const targetVar = script.allocVariable();
      const writer = format.createWriter(filePath, dataName);
      script.assign(targetVar, writer.functionName, writer.props);

      const colmap = normalizeExportColumnMap(columnMap);
      let colmapVar = null;
      if (colmap) {
        colmapVar = script.allocVariable();
        script.assignValue(colmapVar, colmap);
      }

      script.copyStream(sourceVar, targetVar, colmapVar);
      script.endLine();

      return script.getScript();
    }
  );
}

export async function exportSqlDump(connection, databaseName) {
  await saveExportedFile(
    [{ name: 'SQL files', extensions: ['sql'] }],
    `${databaseName}.sql`,
    'sql',
    `${databaseName}-dump`,
    filePath => {
      const script = getCurrentConfig().allowShellScripting ? new ScriptWriter() : new ScriptWriterJson();

      script.dumpDatabase({
        connection,
        databaseName,
        outputFile: filePath,
      });

      return script.getScript();
    }
  );
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

export function openWebLink(href) {
  const electron = getElectron();

  if (electron) {
    electron.send('open-link', href);
  } else {
    window.open(href, '_blank');
  }
}
