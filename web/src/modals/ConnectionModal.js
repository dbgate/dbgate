import React from 'react';
import ModalBase from './ModalBase';
import { FormRow, FormLabel, FormValue, FormTextField, FormSubmit } from '../utility/forms';
import { TextField } from '../utility/inputs';
import { Formik, Form } from 'formik';
// import FormikForm from '../utility/FormikForm';

export default function ConnectionModal({ modalState }) {
  const handleSubmit = values => {
    console.log(values);
    modalState.close();
  };
  return (
    <ModalBase modalState={modalState}>
      <h2>Add connection</h2>
      <Formik onSubmit={handleSubmit} initialValues={{ server: 'localhost' }}>
        <Form>
          <FormTextField label="Server" name="server" />
          <FormTextField label="Port" name="port" />
          <FormTextField label="User" name="user" />
          <FormTextField label="Password" name="password" />
          <FormTextField label="Display name" name="displayName" />

          <FormSubmit />
        </Form>
      </Formik>
    </ModalBase>
  );
}
