import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormRow, FormButton, FormTextField, FormSelectField, FormSubmit } from '../utility/forms';
import { TextField } from '../utility/inputs';
import { Formik, Form } from 'formik';
import { useSetSavedSqlFiles } from '../utility/globalState';
// import FormikForm from '../utility/FormikForm';

export default function SaveSqlFileModal({ storageKey, modalState, name, onSave = undefined }) {
  const setSavedSqlFiles = useSetSavedSqlFiles();
  const handleSubmit = async (values) => {
    const { name } = values;
    setSavedSqlFiles((files) => [
      ...files.filter((x) => x.storageKey != storageKey),
      {
        name,
        storageKey,
      },
    ]);
    modalState.close();
    if (onSave) onSave(name);
  };
  return (
    <ModalBase modalState={modalState}>
      <h2>Save SQL file</h2>
      <Formik onSubmit={handleSubmit} initialValues={{ name }}>
        <Form>
          <FormTextField label="File name" name="name" />

          <FormRow>
            <FormSubmit text="Save" />
          </FormRow>
        </Form>
      </Formik>
    </ModalBase>
  );
}
