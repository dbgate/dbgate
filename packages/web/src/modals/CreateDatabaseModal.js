import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormButton, FormSubmit, FormTextField } from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import { FormProvider } from '../utility/FormProvider';

export default function CreateDatabaseModal({ modalState, conid }) {
  const handleSubmit = async values => {
    const { name } = values;
    axios.post('server-connections/create-database', { conid, name });

    modalState.close();
  };
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Create database</ModalHeader>
      <FormProvider initialValues={{ name: 'newdb' }}>
        <ModalContent>
          <FormTextField label="Database name" name="name" />
        </ModalContent>
        <ModalFooter>
          <FormSubmit value="Create" onClick={handleSubmit} />
        </ModalFooter>
      </FormProvider>
    </ModalBase>
  );
}
