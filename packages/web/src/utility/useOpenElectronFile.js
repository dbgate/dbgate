import useNewQuery from '../query/useNewQuery';
import getElectron from './getElectron';

export function canOpenByElectron(file) {
  return file && file.toLowerCase().endsWith('.sql');
}

export function useOpenElectronFileCore() {
  const newQuery = useNewQuery();

  return filePath => {
    if (filePath.toLowerCase().endsWith('.sql')) {
      const path = window.require('path');
      const fs = window.require('fs');
      const parsed = path.parse(filePath);
      const data = fs.readFileSync(filePath, { encoding: 'utf-8' });

      newQuery({
        title: parsed.name,
        initialData: data,
        // @ts-ignore
        savedFilePath: filePath,
        savedFormat: 'text',
      });
    }
  };
}

export default function useOpenElectronFile() {
  const electron = getElectron();
  const openElectronFileCore = useOpenElectronFileCore();

  return () => {
    const filePaths = electron.remote.dialog.showOpenDialogSync(electron.remote.getCurrentWindow(), {
      filters: [{ name: `SQL files`, extensions: ['sql'] }],
    });
    const filePath = filePaths && filePaths[0];
    if (canOpenByElectron(filePath)) {
      openElectronFileCore(filePath);
    }
  };
}
