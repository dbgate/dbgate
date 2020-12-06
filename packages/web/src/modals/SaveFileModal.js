import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormTextField, FormSubmit } from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import { FormProvider } from '../utility/FormProvider';

export default function SaveFileModal({ data, folder, format, modalState, name, onSave = undefined }) {
  const handleSubmit = async (values) => {
    const { name } = values;
    await axios.post('files/save', { folder, file: name, data, format });
    modalState.close();
    if (onSave) onSave(name);
  };
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Save file</ModalHeader>
      <FormProvider initialValues={{ name }}>
        <ModalContent>
          <FormTextField label="File name" name="name" />
        </ModalContent>
        <ModalFooter>
          <FormSubmit value="Save" onClick={handleSubmit} />
        </ModalFooter>
      </FormProvider>
    </ModalBase>
  );
}
