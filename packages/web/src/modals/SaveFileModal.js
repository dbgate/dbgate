import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormTextField, FormSubmit } from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import { FormProvider } from '../utility/FormProvider';
import FormStyledButton from '../widgets/FormStyledButton';
import getElectron from '../utility/getElectron';

export default function SaveFileModal({
  data,
  folder,
  format,
  modalState,
  name,
  fileExtension,
  filePath,
  onSave = undefined,
}) {
  const electron = getElectron();

  const handleSubmit = async values => {
    const { name } = values;
    await axios.post('files/save', { folder, file: name, data, format });
    modalState.close();
    if (onSave) {
      onSave(name, {
        savedFile: name,
        savedFolder: folder,
        savedFilePath: null,
      });
    }
  };

  const handleSaveToDisk = async filePath => {
    const path = window.require('path');
    const parsed = path.parse(filePath);
    // if (!parsed.ext) filePath += `.${fileExtension}`;

    await axios.post('files/save-as', { filePath, data, format });
    modalState.close();

    if (onSave) {
      onSave(parsed.name, {
        savedFile: null,
        savedFolder: null,
        savedFilePath: filePath,
      });
    }
  };

  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Save file</ModalHeader>
      <FormProvider initialValues={{ name }}>
        <ModalContent>
          <FormTextField label="File name" name="name" focused />
        </ModalContent>
        <ModalFooter>
          <FormSubmit value="Save" onClick={handleSubmit} />
          {electron && (
            <FormStyledButton
              type="button"
              value="Save to disk"
              onClick={() => {
                const file = electron.remote.dialog.showSaveDialogSync(electron.remote.getCurrentWindow(), {
                  filters: [
                    { name: `${fileExtension.toUpperCase()} files`, extensions: [fileExtension] },
                    { name: `All files`, extensions: ['*'] },
                  ],
                  defaultPath: filePath || `${name}.${fileExtension}`,
                  properties: ['showOverwriteConfirmation'],
                });
                if (file) {
                  handleSaveToDisk(file);
                }
              }}
            />
          )}
        </ModalFooter>
      </FormProvider>
    </ModalBase>
  );
}
