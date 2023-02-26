import { ScriptWriter, ScriptWriterJson } from 'dbgate-tools';
import getElectron from './getElectron';
import { showSnackbar, showSnackbarInfo, showSnackbarError, closeSnackbar } from '../utility/snackbar';
import resolveApi from './resolveApi';
import { apiCall, apiOff, apiOn } from './api';
import { normalizeExportColumnMap } from '../impexp/createImpExpScript';
import { getCurrentConfig } from '../stores';
import { showModal } from '../modals/modalTools';
import RunScriptModal from '../modals/RunScriptModal.svelte';
import { QuickExportDefinition } from 'dbgate-types';

export async function importSqlDump(inputFile, connection) {
  const script = getCurrentConfig().allowShellScripting ? new ScriptWriter() : new ScriptWriterJson();

  script.importDatabase({
    inputFile,
    connection,
  });

  showModal(RunScriptModal, { script: script.getScript(), header: 'Importing database' });

  // await runImportExportScript({
  //   script: script.getScript(),
  //   runningMessage: 'Importing database',
  //   canceledMessage: 'Database import canceled',
  //   finishedMessage: 'Database import finished',
  // });
}

export async function exportSqlDump(outputFile, connection, databaseName, pureFileName) {
  const script = getCurrentConfig().allowShellScripting ? new ScriptWriter() : new ScriptWriterJson();

  script.dumpDatabase({
    connection,
    databaseName,
    outputFile,
  });

  showModal(RunScriptModal, {
    script: script.getScript(),
    header: 'Exporting database',
    onOpenResult:
      pureFileName && !getElectron()
        ? () => {
            window.open(`${resolveApi()}/uploads/get?file=${pureFileName}`, '_blank');
          }
        : null,
    openResultLabel: 'Download SQL file',
  });
}

async function runImportExportScript({ script, runningMessage, canceledMessage, finishedMessage, afterFinish = null }) {
  const electron = getElectron();

  const resp = await apiCall('runners/start', { script });
  const runid = resp.runid;
  let isCanceled = false;

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

  function handleRunnerDone() {
    closeSnackbar(snackId);
    apiOff(`runner-done-${runid}`, handleRunnerDone);
    if (isCanceled) {
      showSnackbarError(canceledMessage);
    } else {
      showSnackbarInfo(finishedMessage);
      if (afterFinish) afterFinish();
    }
  }

  apiOn(`runner-done-${runid}`, handleRunnerDone);
}

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

  runImportExportScript({
    script,
    runningMessage: `Exporting ${dataName}`,
    canceledMessage: `Export ${dataName} canceled`,
    finishedMessage: `Export ${dataName} finished`,
    afterFinish: () => {
      if (!electron) {
        window.open(`${resolveApi()}/uploads/get?file=${pureFileName}`, '_blank');
      }
    },
  });
}

function generateQuickExportScript(
  reader,
  format: QuickExportDefinition,
  filePath: string,
  dataName: string,
  columnMap
) {
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

export async function exportQuickExportFile(dataName, reader, format: QuickExportDefinition, columnMap = null) {
  if (format.noFilenameDependency) {
    const script = generateQuickExportScript(reader, format, null, dataName, columnMap);
    runImportExportScript({
      script,
      runningMessage: `Exporting ${dataName}`,
      canceledMessage: `Export ${dataName} canceled`,
      finishedMessage: `Export ${dataName} finished`,
    });
  } else {
    await saveExportedFile(
      [{ name: format.label, extensions: [format.extension] }],
      `${dataName}.${format.extension}`,
      format.extension,
      dataName,
      filePath => generateQuickExportScript(reader, format, filePath, dataName, columnMap)
    );
  }
}

// export async function exportSqlDump(connection, databaseName) {
//   await saveExportedFile(
//     [{ name: 'SQL files', extensions: ['sql'] }],
//     `${databaseName}.sql`,
//     'sql',
//     `${databaseName}-dump`,
//     filePath => {
//       const script = getCurrentConfig().allowShellScripting ? new ScriptWriter() : new ScriptWriterJson();

//       script.dumpDatabase({
//         connection,
//         databaseName,
//         outputFile: filePath,
//       });

//       return script.getScript();
//     }
//   );
// }

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
