import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormButtonRow, FormButton, FormTextField, FormSelectField, FormSubmit } from '../utility/forms';
import { TextField } from '../utility/inputs';
import { Formik, Form } from 'formik';
import ModalHeader from './ModalHeader';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';
import useExtensions from '../utility/useExtensions';
// import FormikForm from '../utility/FormikForm';

export default function ConnectionModal({ modalState, connection = undefined }) {
  const [sqlConnectResult, setSqlConnectResult] = React.useState('Not connected');
  const extensions = useExtensions();

  const handleTest = async (values) => {
    const resp = await axios.post('connections/test', values);
    const { error, version } = resp.data;

    setSqlConnectResult(error || version);
  };

  const handleSubmit = async (values) => {
    const resp = await axios.post('connections/save', values);

    modalState.close();
  };
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>{connection ? 'Edit connection' : 'Add connection'}</ModalHeader>
      <Formik onSubmit={handleSubmit} initialValues={connection || { server: 'localhost', engine: 'mssql' }}>
        <Form>
          <ModalContent>
            <FormSelectField label="Database engine" name="engine">
              <option value=""></option>
              {extensions.drivers.map((driver) => (
                <option value={driver.engine} key={driver.engine}>
                  {driver.title}
                </option>
              ))}
              {/* <option value="mssql">Microsoft SQL Server</option>
              <option value="mysql">MySQL</option>
              <option value="postgres">Postgre SQL</option> */}
            </FormSelectField>
            <FormTextField label="Server" name="server" />
            <FormTextField label="Port" name="port" />
            <FormTextField label="User" name="user" />
            <FormTextField label="Password" name="password" />
            <FormTextField label="Display name" name="displayName" />
            <div>Connect result: {sqlConnectResult}</div>
          </ModalContent>

          <ModalFooter>
            <FormButton text="Test" onClick={handleTest} />
            <FormSubmit text="Save" />
          </ModalFooter>
        </Form>
      </Formik>
    </ModalBase>
  );
}
