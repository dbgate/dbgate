import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormRow, FormButton, FormTextField, FormSelectField, FormSubmit } from '../utility/forms';
import { TextField } from '../utility/inputs';
import { Formik, Form } from 'formik';
// import FormikForm from '../utility/FormikForm';

export default function ConnectionModal({ modalState, connection = undefined }) {
  const [sqlConnectResult, setSqlConnectResult] = React.useState('Not connected');

  const handleTest = async values => {
    const resp = await axios.post('connections/test', values);
    const { error, version } = resp.data;

    setSqlConnectResult(error || version);
  };

  const handleSubmit = async values => {
    const resp = await axios.post('connections/save', values);

    modalState.close();
  };
  return (
    <ModalBase modalState={modalState}>
      <h2>{connection ? 'Edit connection' : 'Add connection'}</h2>
      <Formik onSubmit={handleSubmit} initialValues={connection || { server: 'localhost', engine: 'mssql' }}>
        <Form>
          <FormSelectField label="Database engine" name="engine">
            <option value="mssql">Microsoft SQL Server</option>
            <option value="mysql">MySQL</option>
            <option value="postgres">Postgre SQL</option>
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
