import React from 'react';
import { useDropzone } from 'react-dropzone';
import ImportExportModal from '../modals/ImportExportModal';
import useShowModal from '../modals/showModal';
import { findFileFormat } from './fileformats';
import getElectron from './getElectron';
import resolveApi from './resolveApi';
import useExtensions from './useExtensions';
import { useOpenElectronFileCore, canOpenByElectron } from './useOpenElectronFile';

const UploadsContext = React.createContext(null);

export default function UploadsProvider({ children }) {
  const [uploadListener, setUploadListener] = React.useState(null);
  return <UploadsContext.Provider value={{ uploadListener, setUploadListener }}>{children}</UploadsContext.Provider>;
}

export function useUploadsProvider() {
  return React.useContext(UploadsContext);
}

export function useUploadFiles() {
  const { uploadListener } = useUploadsProvider();
  const showModal = useShowModal();
  const extensions = useExtensions();
  const electron = getElectron();
  const openElectronFileCore = useOpenElectronFileCore();

  const handleUploadFiles = React.useCallback(
    files => {
      files.forEach(async file => {
        if (parseInt(file.size, 10) >= 4 * 1024 * 1024) {
          // to big file
          return;
        }

        console.log('FILE', file);

        if (electron && canOpenByElectron(file.path)) {
          openElectronFileCore(file.path);
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

        for (const format of extensions.fileFormats) {
          if (file.name.endsWith('.' + format.extension)) {
            fileData.shortName = file.name.slice(0, -format.extension.length - 1);
            fileData.storageType = format.storageType;
          }
        }

        if (uploadListener) {
          uploadListener(fileData);
        } else {
          if (findFileFormat(extensions, fileData.storageType)) {
            showModal(modalState => (
              <ImportExportModal
                uploadedFile={fileData}
                modalState={modalState}
                importToArchive
                initialValues={{
                  sourceStorageType: fileData.storageType,
                  // sourceConnectionId: data.conid,
                  // sourceDatabaseName: data.database,
                  // sourceSchemaName: data.schemaName,
                  // sourceList: [data.pureName],
                }}
              />
            ));
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
    },
    [uploadListener, extensions]
  );

  return handleUploadFiles;
}

export function useUploadsZone() {
  const onDrop = useUploadFiles();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return { getRootProps, getInputProps, isDragActive };
}
