import ScriptWriter from '../impexp/ScriptWriter';
import getElectron from './getElectron';
import axiosInstance from '../utility/axiosInstance';

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

  console.log('format.createWriter(filePath, dataName)', format.createWriter(filePath, dataName));

  const targetVar = script.allocVariable();
  const writer = format.createWriter(filePath, dataName);
  script.assign(targetVar, writer.functionName, writer.props);

  script.copyStream(sourceVar, targetVar);
  script.put();

  console.log('script.getScript()', script.getScript());

  const resp = await axiosInstance.post('runners/start', { script: script.getScript() });
  const runid = resp.data.runid;
}
