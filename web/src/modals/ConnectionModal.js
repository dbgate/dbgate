import React from 'react';
import axios from 'axios';
import ModalBase from './ModalBase';
import { FormRow, FormLabel, FormValue, FormTextField, FormSubmit } from '../utility/forms';
import { TextField } from '../utility/inputs';
import { Formik, Form } from 'formik';
// import FormikForm from '../utility/FormikForm';

export default function ConnectionModal({ modalState }) {
  const [sqlConnectResult, setSqlConnectResult] = React.useState('Not connected');

  const handleSubmit = async values => {
    const resp = await axios.post('http://localhost:3000/connection/test', values);
    console.log('resp.data', resp.data);
    const { error, version } = resp.data;

    setSqlConnectResult(error || version);

    // modalState.close();
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
      <div>Connect result: {sqlConnectResult}</div>
    </ModalBase>
  );
}
