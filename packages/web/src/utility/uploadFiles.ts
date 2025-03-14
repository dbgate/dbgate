import { extensions } from '../stores';
import { get } from 'svelte/store';
import { canOpenByElectron, openElectronFileCore } from './openElectronFile';
import getElectron from './getElectron';
import resolveApi, { resolveApiHeaders } from './resolveApi';
import { findFileFormat } from '../plugins/fileformats';
import { showModal } from '../modals/modalTools';
import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
import openNewTab from './openNewTab';
import { openImportExportTab } from './importExportTools';
import { canOpenByWeb, openWebFileCore } from './openWebFile';

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
    if (electron && canOpenByElectron(file.path, ext)) {
      openElectronFileCore(file.path, ext);
      return;
    }

    if (!electron && canOpenByWeb(file.path, ext)) {
      openWebFileCore(file, ext);
      return;
    }

    const maxSize = 32 * 1024 * 1024;
    if (parseInt(file.size, 10) >= maxSize) {
      showModal(ErrorMessageModal, {
        title: 'Upload error',
        message: `File is too big, current size is ${Math.round(
          file.size / 1024
        ).toLocaleString()} KB, max allowed size is ${Math.round(maxSize / 1024).toLocaleString()} KB`,
      });
      // to big file
      return;
    }

    const formData = new FormData();
    formData.append('data', file);

    const fetchOptions = {
      method: 'POST',
      body: formData,
      headers: resolveApiHeaders(),
    };

    const apiBase = resolveApi();
    const resp = await fetch(`${apiBase}/uploads/upload`, fetchOptions);
    const fileData = await resp.json();

    fileData.shortName = file.name;

    if (file.name.endsWith('.jsonl') || file.name.endsWith('.ndjson')) {
      openNewTab({
        title: fileData.shortName,
        icon: 'img archive',
        tabComponent: 'ArchiveFileTab',
        props: {
          jslid: `file://${fileData.filePath}`,
        },
      });
      return;
    }

    for (const format of ext.fileFormats) {
      if (file.name.endsWith('.' + format.extension)) {
        // || format.extensions?.find(ext => file.name.endsWith('.' + ext))
        fileData.shortName = file.name.slice(0, -format.extension.length - 1);
        fileData.storageType = format.storageType;
      }
    }

    if (uploadListener) {
      uploadListener(fileData);
    } else {
      if (findFileFormat(ext, fileData.storageType)) {
        openImportExportTab(
          {
            sourceStorageType: fileData.storageType,
          },
          {
            uploadedFile: fileData,
            importToCurrentTarget: true,
          }
        );

        // showModal(ImportExportModal, {
        //   uploadedFile: fileData,
        //   importToCurrentTarget: true,
        //   initialValues: {
        //     sourceStorageType: fileData.storageType,
        //   },
        // });
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
