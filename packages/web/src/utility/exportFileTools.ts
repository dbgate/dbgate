import { ScriptWriterJson } from 'dbgate-tools';
import getElectron from './getElectron';
import {
  showSnackbar,
  showSnackbarInfo,
  showSnackbarError,
  closeSnackbar,
  updateSnackbarProgressMessage,
} from '../utility/snackbar';
import resolveApi, { resolveApiHeaders } from './resolveApi';
import { apiCall, apiOff, apiOn } from './api';
import { normalizeExportColumnMap } from '../impexp/createImpExpScript';
import { QuickExportDefinition } from 'dbgate-types';
import uuidv1 from 'uuid/v1';

// export async function importSqlDump(inputFile, connection) {
//   const script = getCurrentConfig().allowShellScripting ? new ScriptWriterJavaScript() : new ScriptWriterJson();

//   script.importDatabase({
//     inputFile,
//     connection,
//   });

//   showModal(RunScriptModal, { script: script.getScript(), header: 'Importing database' });

//   // await runImportExportScript({
//   //   script: script.getScript(),
//   //   runningMessage: 'Importing database',
//   //   canceledMessage: 'Database import canceled',
//   //   finishedMessage: 'Database import finished',
//   // });
// }

// export async function exportSqlDump(outputFile, connection, databaseName, pureFileName) {
//   const script = getCurrentConfig().allowShellScripting ? new ScriptWriterJavaScript() : new ScriptWriterJson();

//   script.dumpDatabase({
//     connection,
//     databaseName,
//     outputFile,
//   });

//   showModal(RunScriptModal, {
//     script: script.getScript(),
//     header: 'Exporting database',
//     onOpenResult:
//       pureFileName && !getElectron()
//         ? () => {
//             downloadFromApi(`uploads/get?file=${pureFileName}`, 'file.sql');
//           }
//         : null,
//     openResultLabel: 'Download SQL file',
//   });
// }

async function runImportExportScript({
  script,
  runningMessage,
  canceledMessage,
  finishedMessage,
  afterFinish = null,
  hostConnection = null,
}) {
  const electron = getElectron();

  let runid;
  let isCanceled = false;

  if (hostConnection) {
    runid = uuidv1();
    await apiCall('database-connections/eval-json-script', {
      runid,
      conid: hostConnection.conid,
      database: hostConnection.database,
      script,
    });
  } else {
    const resp = await apiCall('runners/start', { script });
    runid = resp.runid;
  }

  const snackId = showSnackbar({
    message: runningMessage,
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

  function handleRunnerProgress(data) {
    const rows = data.writtenRowsCount || data.readRowCount;
    if (rows) {
      updateSnackbarProgressMessage(snackId, `${rows} rows processed`);
    }
  }

  function handleRunnerDone() {
    closeSnackbar(snackId);
    apiOff(`runner-done-${runid}`, handleRunnerDone);
    apiOff(`runner-progress-${runid}`, handleRunnerProgress);
    if (isCanceled) {
      showSnackbarError(canceledMessage);
    } else {
      showSnackbarInfo(finishedMessage);
      if (afterFinish) afterFinish();
    }
  }

  apiOn(`runner-done-${runid}`, handleRunnerDone);
  apiOn(`runner-progress-${runid}`, handleRunnerProgress);
}

export async function saveExportedFile(
  filters,
  defaultPath,
  extension,
  dataName,
  getScript: (filaPath: string) => {},
  hostConnection = null
) {
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

  runImportExportScript({
    script,
    runningMessage: `Exporting ${dataName}`,
    canceledMessage: `Export ${dataName} canceled`,
    finishedMessage: `Export ${dataName} finished`,
    afterFinish: () => {
      if (!electron) {
        downloadFromApi(`uploads/get?file=${pureFileName}`, defaultPath);
      }
    },
    hostConnection,
  });
}

function generateQuickExportScript(
  reader,
  format: QuickExportDefinition,
  filePath: string,
  dataName: string,
  columnMap
) {
  const script = new ScriptWriterJson();

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

  script.copyStream(sourceVar, targetVar, colmapVar, 'data');
  script.endLine();

  return script.getScript();
}

export async function exportQuickExportFile(dataName, reader, format: QuickExportDefinition, columnMap = null) {
  if (format.noFilenameDependency) {
    const script = generateQuickExportScript(reader, format, null, dataName, columnMap);
    runImportExportScript({
      script,
      runningMessage: `Exporting ${dataName}`,
      canceledMessage: `Export ${dataName} canceled`,
      finishedMessage: `Export ${dataName} finished`,
      hostConnection: reader.hostConnection,
    });
  } else {
    await saveExportedFile(
      [{ name: format.label, extensions: [format.extension] }],
      `${dataName}.${format.extension}`,
      format.extension,
      dataName,
      filePath => generateQuickExportScript(reader, format, filePath, dataName, columnMap),
      reader.hostConnection
    );
  }
}

export async function saveFileToDisk(
  filePathFunc,
  options: any = { formatLabel: 'HTML page', formatExtension: 'html', defaultFileName: null }
) {
  const { formatLabel, formatExtension } = options;
  const electron = getElectron();

  if (electron) {
    const filters = [{ name: formatLabel, extensions: [formatExtension] }];
    const filePath = await electron.showSaveDialog({
      filters,
      defaultPath: options.defaultFileName ?? `file.${formatExtension}`,
      properties: ['showOverwriteConfirmation'],
    });
    if (!filePath) return;
    await filePathFunc(filePath);
    electron.openExternal('file:///' + filePath);
  } else {
    const resp = await apiCall('files/generate-uploads-file');
    await filePathFunc(resp.filePath);
    await downloadFromApi(`uploads/get?file=${resp.fileName}`, options.defaultFileName ?? `file.${formatExtension}`);
  }
}

export async function downloadFromApi(route: string, donloadName: string) {
  fetch(`${resolveApi()}/${route}`, {
    method: 'GET',
    headers: resolveApiHeaders(),
  })
    .then(res => res.blob())
    .then(blob => {
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.download = donloadName;
      a.href = objUrl;
      a.click();
      a.remove();
      setTimeout(() => {
        URL.revokeObjectURL(objUrl);
      });
    });
}
