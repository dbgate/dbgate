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
import LoadingInfo from '../widgets/LoadingInfo';
import { FontIcon } from '../icons';
// import FormikForm from '../utility/FormikForm';

export default function ConnectionModal({ modalState, connection = undefined }) {
  const [sqlConnectResult, setSqlConnectResult] = React.useState(null);
  const extensions = useExtensions();
  const [isTesting, setIsTesting] = React.useState(false);
  const testIdRef = React.useRef(0);

  const handleTest = async (values) => {
    setIsTesting(true);
    testIdRef.current += 1;
    const testid = testIdRef.current;
    const resp = await axios.post('connections/test', values);
    if (testIdRef.current != testid) return;

    setIsTesting(false);
    setSqlConnectResult(resp.data);
  };

  const handleCancel = async () => {
    testIdRef.current += 1; // invalidate current test
    setIsTesting(false);
  };

  const handleSubmit = async (values) => {
    axios.post('connections/save', values);
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
            <FormTextField label="Password" name="password" type="password" />
            <FormTextField label="Display name" name="displayName" />
            {!isTesting && sqlConnectResult && sqlConnectResult.msgtype == 'connected' && (
              <div>
                Connected: <FontIcon icon="img ok" /> {sqlConnectResult.version}
              </div>
            )}
            {!isTesting && sqlConnectResult && sqlConnectResult.msgtype == 'error' && (
              <div>
                Connect failed: <FontIcon icon="img error" /> {sqlConnectResult.error}
              </div>
            )}
            {isTesting && <LoadingInfo message="Testing connection" />}
          </ModalContent>

          <ModalFooter>
            {isTesting ? (
              <FormButton text="Cancel" onClick={handleCancel} />
            ) : (
              <FormButton text="Test" onClick={handleTest} />
            )}

            <FormSubmit text="Save" />
          </ModalFooter>
        </Form>
      </Formik>
    </ModalBase>
  );
}
