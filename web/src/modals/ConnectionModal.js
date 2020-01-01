import React from 'react';
import axios from 'axios';
import ModalBase from './ModalBase';
import { FormRow, FormButton, FormTextField, FormSelectField, FormSubmit } from '../utility/forms';
import { TextField } from '../utility/inputs';
import { Formik, Form } from 'formik';
// import FormikForm from '../utility/FormikForm';

export default function ConnectionModal({ modalState }) {
  const [sqlConnectResult, setSqlConnectResult] = React.useState('Not connected');

  const handleTest = async values => {
    const resp = await axios.post('http://localhost:3000/connection/test', values);
    console.log('resp.data', resp.data);
    const { error, version } = resp.data;

    setSqlConnectResult(error || version);

    // modalState.close();
  };

  const handleSubmit = async values => {
    const resp = await axios.post('http://localhost:3000/connection/save', values);
    console.log('resp.data', resp.data);

    // modalState.close();
  };
  return (
    <ModalBase modalState={modalState}>
      <h2>Add connection</h2>
      <Formik onSubmit={handleSubmit} initialValues={{ server: 'localhost', engine: 'mssql' }}>
        <Form>
          <FormSelectField label="Database engine" name="engine">
            <option value="mssql">Microsoft SQL Server</option>
            <option value="mysql">MySQL</option>
            <option value="postgre">Postgre SQL</option>
          </FormSelectField>
          <FormTextField label="Server" name="server" />
          <FormTextField label="Port" name="port" />
          <FormTextField label="User" name="user" />
          <FormTextField label="Password" name="password" />
          <FormTextField label="Display name" name="displayName" />

          <FormRow>
            <FormButton text="Test" onClick={handleTest} />
            <FormSubmit text="Save" />
          </FormRow>
        </Form>
      </Formik>
      <div>Connect result: {sqlConnectResult}</div>
    </ModalBase>
  );
}
