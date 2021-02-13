import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import {
  FormButton,
  FormTextField,
  FormSelectField,
  FormSubmit,
  FormPasswordField,
  FormCheckboxField,
  FormElectronFileSelector,
} from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';
import useExtensions from '../utility/useExtensions';
import LoadingInfo from '../widgets/LoadingInfo';
import { FontIcon } from '../icons';
import { FormProvider, useForm } from '../utility/FormProvider';
import { TabControl, TabPage } from '../widgets/TabControl';
import { usePlatformInfo } from '../utility/metadataLoaders';
import getElectron from '../utility/getElectron';
import { FormFieldTemplateLarge } from '../utility/formStyle';
import styled from 'styled-components';
// import FormikForm from '../utility/FormikForm';

const FlexContainer = styled.div`
  display: flex;
`;

const TestResultContainer = styled.div`
  margin-left: 10px;
  align-self: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ButtonsContainer = styled.div`
  flex-shrink: 0;
`;

const AgentInfoWrap = styled.div`
  margin-left: 20px;
`;

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

function SshTunnelFields() {
  const { values, setFieldValue } = useForm();
  const { useSshTunnel, sshMode, sshKeyfile } = values;
  const platformInfo = usePlatformInfo();
  const electron = getElectron();

  React.useEffect(() => {
    if (useSshTunnel && !sshMode) {
      setFieldValue('sshMode', 'userPassword');
    }
    if (useSshTunnel && sshMode == 'keyFile' && !sshKeyfile) {
      setFieldValue('sshKeyfile', platformInfo.defaultKeyFile);
    }
  }, [useSshTunnel, sshMode]);

  return (
    <>
      <FormCheckboxField label="Use SSH tunnel" name="useSshTunnel" />
      <FormTextField label="Host" name="sshHost" disabled={!useSshTunnel} />
      <FormTextField label="Port" name="sshPort" disabled={!useSshTunnel} />
      <FormTextField label="Bastion host (Jump host)" name="sshBastionHost" disabled={!useSshTunnel} />

      <FormSelectField label="SSH Authentication" name="sshMode" disabled={!useSshTunnel}>
        <option value="userPassword">Username &amp; password</option>
        <option value="agent">SSH agent</option>
        {!!electron && <option value="keyFile">Key file</option>}
      </FormSelectField>

      <FormTextField label="Login" name="sshLogin" disabled={!useSshTunnel} />

      {sshMode == 'userPassword' && <FormPasswordField label="Password" name="sshPassword" disabled={!useSshTunnel} />}

      {sshMode == 'keyFile' && (
        <FormElectronFileSelector label="Private key file" name="sshKeyfile" disabled={!useSshTunnel} />
      )}

      {sshMode == 'keyFile' && (
        <FormPasswordField label="Key file passphrase" name="sshKeyfilePassword" disabled={!useSshTunnel} />
      )}

      {useSshTunnel && sshMode == 'agent' && (
        <AgentInfoWrap>
          {platformInfo.sshAuthSock ? (
            <div>
              <FontIcon icon="img ok" /> SSH Agent found
            </div>
          ) : (
            <div>
              <FontIcon icon="img error" /> SSH Agent not found
            </div>
          )}
        </AgentInfoWrap>
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
      <FormProvider
        initialValues={connection || { server: 'localhost', engine: 'mssql@dbgate-plugin-mssql' }}
        template={FormFieldTemplateLarge}
      >
        <ModalContent noPadding>
          <TabControl isInline>
            <TabPage label="Main" key="main">
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
            </TabPage>
            <TabPage label="SSH Tunnel" key="sshTunnel">
              <SshTunnelFields />
            </TabPage>
          </TabControl>
        </ModalContent>

        <ModalFooter>
          <FlexContainer>
            <ButtonsContainer>
              {isTesting ? (
                <FormButton value="Cancel" onClick={handleCancel} />
              ) : (
                <FormButton value="Test" onClick={handleTest} />
              )}

              <FormSubmit value="Save" onClick={handleSubmit} />
            </ButtonsContainer>

            <TestResultContainer>
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
              {isTesting && (
                <div>
                  <FontIcon icon="icon loading" /> Testing connection
                </div>
              )}
            </TestResultContainer>
          </FlexContainer>
        </ModalFooter>
      </FormProvider>
    </ModalBase>
  );
}
