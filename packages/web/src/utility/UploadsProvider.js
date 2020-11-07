import React from 'react';
import { useDropzone } from 'react-dropzone';
import ImportExportModal from '../modals/ImportExportModal';
import useShowModal from '../modals/showModal';
import resolveApi from './resolveApi';

const UploadsContext = React.createContext(null);

export default function UploadsProvider({ children }) {
  const [uploadListener, setUploadListener] = React.useState(null);
  return <UploadsContext.Provider value={{ uploadListener, setUploadListener }}>{children}</UploadsContext.Provider>;
}

export function useUploadsProvider() {
  return React.useContext(UploadsContext);
}

export function useUploadsZone() {
  const { uploadListener } = useUploadsProvider();
  const showModal = useShowModal();

  const onDrop = React.useCallback(
    (files) => {
      files.forEach(async (file) => {
        if (parseInt(file.size, 10) >= 4 * 1024 * 1024) {
          // to big file
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

        if (uploadListener) {
          uploadListener(fileData);
        } else {
          if (['csv', 'excel', 'jsonl'].includes(fileData.storageType)) {
            showModal((modalState) => (
              <ImportExportModal
                uploadedFile={fileData}
                modalState={modalState}
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
    [uploadListener]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return { getRootProps, getInputProps, isDragActive };
}
