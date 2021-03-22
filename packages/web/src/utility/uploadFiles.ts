import { extensions } from '../stores';
import { get } from 'svelte/store';
import { canOpenByElectron, openElectronFileCore } from './openElectronFile';
import getElectron from './getElectron';
import resolveApi from './resolveApi';
import { findFileFormat } from '../plugins/fileformats';
import { showModal } from '../modals/modalTools';
import ImportExportModal from '../modals/ImportExportModal.svelte';

let uploadListener;

export function setUploadListener(value) {
  uploadListener = value;
}

export function getUploadListener() {
  return uploadListener;
}

export default function uploadFiles(files) {
  const ext = get(extensions);
  const electron = getElectron();
  files.forEach(async file => {
    if (parseInt(file.size, 10) >= 4 * 1024 * 1024) {
      // to big file
      return;
    }

    console.log('FILE', file);

    if (electron && canOpenByElectron(file.path, ext)) {
      openElectronFileCore(file.path, ext);
      return;
    }

    const formData = new FormData();
    formData.append('data', file);

    const fetchOptions = {
      method: 'POST',
      body: formData,
    };

    const apiBase = resolveApi();
    const resp = await fetch(`${apiBase}/uploads/upload`, fetchOptions);
    const fileData = await resp.json();

    fileData.shortName = file.name;

    for (const format of ext.fileFormats) {
      if (file.name.endsWith('.' + format.extension)) {
        fileData.shortName = file.name.slice(0, -format.extension.length - 1);
        fileData.storageType = format.storageType;
      }
    }

    if (uploadListener) {
      uploadListener(fileData);
    } else {
      if (findFileFormat(ext, fileData.storageType)) {
        showModal(ImportExportModal, {
          uploadedFile: fileData,
          importToArchive: true,
          initialValues: {
            sourceStorageType: fileData.storageType,
          },
        });
      }
    }

    // const reader = new FileReader();

    // reader.onabort = () => console.log('file reading was aborted');
    // reader.onerror = () => console.log('file reading has failed');
    // reader.onload = () => {
    //   // Do whatever you want with the file contents
    //   const binaryStr = reader.result;
    //   console.log(binaryStr);
    // };
    // reader.readAsArrayBuffer(file);
  });
}
