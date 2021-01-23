import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormButton, FormTextField, FormSelectField, FormSubmit, FormPasswordField } from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';
import useExtensions from '../utility/useExtensions';
import LoadingInfo from '../widgets/LoadingInfo';
import { FontIcon } from '../icons';
import { FormProvider, useForm } from '../utility/FormProvider';
// import FormikForm from '../utility/FormikForm';

function DriverFields({ extensions }) {
  const { values, setFieldValue } = useForm();
  const { authType, engine } = values;
  const driver = extensions.drivers.find(x => x.engine == engine);
  // const { authTypes } = driver || {};
  const [authTypes, setAuthTypes] = React.useState(null);
  const currentAuthType = authTypes && authTypes.find(x => x.name == authType);

  const loadAuthTypes = async () => {
    const resp = await axios.post('plugins/auth-types', { engine });
    setAuthTypes(resp.data);
    if (resp.data && !currentAuthType) {
      setFieldValue('authType', resp.data[0].name);
    }
  };

  React.useEffect(() => {
    setAuthTypes(null);
    loadAuthTypes();
  }, [values.engine]);

  if (!driver) return null;
  const disabledFields = (currentAuthType ? currentAuthType.disabledFields : null) || [];

  return (
    <>
      {!!authTypes && (
        <FormSelectField label="Authentication" name="authType">
          {authTypes.map(auth => (
            <option value={auth.name} key={auth.name}>
              {auth.title}
            </option>
          ))}
        </FormSelectField>
      )}
      <FormTextField label="Server" name="server" disabled={disabledFields.includes('server')} />
      <FormTextField label="Port" name="port" disabled={disabledFields.includes('port')} />
      <FormTextField label="User" name="user" disabled={disabledFields.includes('user')} />
      <FormPasswordField label="Password" name="password" disabled={disabledFields.includes('password')} />
      {!disabledFields.includes('password') && (
        <FormSelectField label="Password mode" name="passwordMode">
          <option value="saveEncrypted">Save and encrypt</option>
          <option value="saveRaw">Save raw (UNSAFE!!)</option>
        </FormSelectField>
      )}
    </>
  );
}

export default function ConnectionModal({ modalState, connection = undefined }) {
  const [sqlConnectResult, setSqlConnectResult] = React.useState(null);
  const extensions = useExtensions();
  const [isTesting, setIsTesting] = React.useState(false);
  const testIdRef = React.useRef(0);

  const handleTest = async values => {
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

  const handleSubmit = async values => {
    axios.post('connections/save', values);
    modalState.close();
  };
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>{connection ? 'Edit connection' : 'Add connection'}</ModalHeader>
      <FormProvider initialValues={connection || { server: 'localhost', engine: 'mssql@dbgate-plugin-mssql' }}>
        <ModalContent>
          <FormSelectField label="Database engine" name="engine">
            <option value="(select driver)"></option>
            {extensions.drivers.map(driver => (
              <option value={driver.engine} key={driver.engine}>
                {driver.title}
              </option>
            ))}
            {/* <option value="mssql">Microsoft SQL Server</option>
              <option value="mysql">MySQL</option>
              <option value="postgres">Postgre SQL</option> */}
          </FormSelectField>
          <DriverFields extensions={extensions} />
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
            <FormButton value="Cancel" onClick={handleCancel} />
          ) : (
            <FormButton value="Test" onClick={handleTest} />
          )}

          <FormSubmit value="Save" onClick={handleSubmit} />
        </ModalFooter>
      </FormProvider>
    </ModalBase>
  );
}
