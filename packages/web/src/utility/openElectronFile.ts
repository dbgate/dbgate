import { showModal } from '../modals/modalTools';
import newQuery from '../query/newQuery';
import ImportExportModal from '../modals/ImportExportModal.svelte';

export function canOpenByElectron(file, extensions) {
  if (!file) return false;
  const nameLower = file.toLowerCase();
  if (nameLower.endsWith('.sql')) return true;
  for (const format of extensions.fileFormats) {
    if (nameLower.endsWith(`.${format.extension}`)) return true;
  }
  return false;
}

export function openElectronFileCore(filePath, extensions) {
  const nameLower = filePath.toLowerCase();
  const path = window.require('path');
  const fs = window.require('fs');
  const parsed = path.parse(filePath);

  if (nameLower.endsWith('.sql')) {
    const data = fs.readFileSync(filePath, { encoding: 'utf-8' });

    newQuery({
      title: parsed.name,
      initialData: data,
      // @ts-ignore
      savedFilePath: filePath,
      savedFormat: 'text',
    });
  }
  for (const format of extensions.fileFormats) {
    if (nameLower.endsWith(`.${format.extension}`)) {
      showModal(ImportExportModal, {
        openedFile: {
          filePath,
          storageType: format.storageType,
          shortName: parsed.name,
        },
        importToArchive: true,
        initialValues: {
          sourceStorageType: format.storageType,
        },
      });
    }
  }
}
