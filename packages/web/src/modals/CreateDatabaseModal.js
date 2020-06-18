import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormTextField, FormSubmit } from '../utility/forms';
import { Formik, Form } from 'formik';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';

export default function CreateDatabaseModal({ modalState, conid }) {
  const handleSubmit = async (values) => {
    const { name } = values;
    axios.post('server-connections/create-database', { conid, name });

    modalState.close();
  };
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Create database</ModalHeader>
      <Formik onSubmit={handleSubmit} initialValues={{ name: 'newdb' }}>
        <Form>
          <ModalContent>
            <FormTextField label="Database name" name="name" />
          </ModalContent>
          <ModalFooter>
            <FormSubmit text="Create" />
          </ModalFooter>
        </Form>
      </Formik>
    </ModalBase>
  );
}
