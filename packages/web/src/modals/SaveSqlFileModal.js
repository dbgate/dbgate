import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormButtonRow, FormButton, FormTextField, FormSelectField, FormSubmit } from '../utility/forms';
import { TextField } from '../utility/inputs';
import { Formik, Form } from 'formik';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
// import FormikForm from '../utility/FormikForm';

export default function SaveSqlFileModal({ storageKey, modalState, name, onSave = undefined }) {
  const handleSubmit = async (values) => {
    const { name } = values;
    await axios.post('files/save', { folder: 'sql', file: name, data: localStorage.getItem(storageKey) });
    modalState.close();
    if (onSave) onSave(name);
  };
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Save SQL file</ModalHeader>
      <Formik onSubmit={handleSubmit} initialValues={{ name }}>
        <Form>
          <ModalContent>
            <FormTextField label="File name" name="name" />
          </ModalContent>
          <ModalFooter>
            <FormSubmit text="Save" />
          </ModalFooter>
        </Form>
      </Formik>
    </ModalBase>
  );
}
