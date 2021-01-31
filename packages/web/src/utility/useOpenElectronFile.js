import _ from 'lodash';
import React from 'react';
import ImportExportModal from '../modals/ImportExportModal';
import useShowModal from '../modals/showModal';
import useNewQuery from '../query/useNewQuery';
import getElectron from './getElectron';
import useExtensions from './useExtensions';

export function canOpenByElectron(file, extensions) {
  if (!file) return false;
  const nameLower = file.toLowerCase();
  if (nameLower.endsWith('.sql')) return true;
  for (const format of extensions.fileFormats) {
    if (nameLower.endsWith(`.${format.extension}`)) return true;
  }
  return false;
}

export function useOpenElectronFileCore() {
  const newQuery = useNewQuery();
  const extensions = useExtensions();
  const showModal = useShowModal();

  return filePath => {
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
        showModal(modalState => (
          <ImportExportModal
            openedFile={{
              filePath,
              storageType: format.storageType,
              shortName: parsed.name,
            }}
            modalState={modalState}
            importToArchive
            initialValues={{
              sourceStorageType: format.storageType,
            }}
          />
        ));
      }
    }
  };
}

function getFileFormatFilters(extensions) {
  return extensions.fileFormats.filter(x => x.readerFunc).map(x => ({ name: x.name, extensions: [x.extension] }));
}

function getFileFormatExtensions(extensions) {
  return extensions.fileFormats.filter(x => x.readerFunc).map(x => x.extension);
}

export default function useOpenElectronFile() {
  const electron = getElectron();
  const openElectronFileCore = useOpenElectronFileCore();
  const extensions = useExtensions();

  return () => {
    const filePaths = electron.remote.dialog.showOpenDialogSync(electron.remote.getCurrentWindow(), {
      filters: [
        { name: `All supported files`, extensions: ['sql', ...getFileFormatExtensions(extensions)] },
        { name: `SQL files`, extensions: ['sql'] },
        ...getFileFormatFilters(extensions),
      ],
    });
    const filePath = filePaths && filePaths[0];
    if (canOpenByElectron(filePath, extensions)) {
      openElectronFileCore(filePath);
    }
  };
}
