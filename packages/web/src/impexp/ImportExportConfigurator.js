import React from 'react';
import FormStyledButton from '../widgets/FormStyledButton';
import { Formik, Form, useFormik, useFormikContext } from 'formik';
import styled from 'styled-components';
import Select from 'react-select';
import { FontIcon } from '../icons';
import { FormButtonRow, FormSubmit, FormReactSelect, FormConnectionSelect, FormDatabaseSelect } from '../utility/forms';
import { useConnectionList, useDatabaseList } from '../utility/metadataLoaders';

const Wrapper = styled.div`
  display: flex;
`;

const Column = styled.div`
  margin: 10px;
  flex: 1;
`;

const StyledSelect = styled(Select)`
  // min-width: 350px;
`;

const OptionsWrapper = styled.div`
  margin-left: 10px;
`;

const Label = styled.div`
  margin: 5px;
  margin-top: 15px;
  color: #777;
`;

function DatabaseSelector() {
  const connections = useConnectionList();
  const connectionOptions = React.useMemo(
    () =>
      (connections || []).map((conn) => ({
        value: conn._id,
        label: conn.displayName || conn.server,
      })),
    [connections]
  );

  // const databases = useDatabaseList({ conid: _id });

  return (
    <>
      <Label>Server</Label>
      <StyledSelect
        options={connectionOptions}
        // defaultValue={type}
        // onChange={setType}
        menuPortalTarget={document.body}
      />
    </>
  );
}

function SourceTargetConfig({
  isSource = false,
  isTarget = false,
  storageTypeField,
  connectionIdField,
  databaseNameField,
}) {
  const types = [
    { value: 'database', label: 'Database' },
    { value: 'csv', label: 'CSV file(s)' },
    { value: 'json', label: 'JSON file(s)' },
  ];
  const { values } = useFormikContext();
  return (
    <Column>
      {isSource && <Label>Source configuration</Label>}
      {isTarget && <Label>Target configuration</Label>}
      <FormReactSelect options={types} name={storageTypeField} />
      {values[storageTypeField] == 'database' && (
        <>
          <Label>Server</Label>
          <FormConnectionSelect name={connectionIdField} />
          <Label>Database</Label>
          <FormDatabaseSelect conidName={connectionIdField} name={databaseNameField} />
        </>
      )}
    </Column>
  );
}

export default function ImportExportConfigurator() {
  return (
    <Formik onSubmit={null} initialValues={{ sourceStorageType: 'database', targetStorageType: 'csv' }}>
      <Form>
        <Wrapper>
          <SourceTargetConfig
            isSource
            storageTypeField="sourceStorageType"
            connectionIdField="sourceConnectionId"
            databaseNameField="sourceDatabaseName"
          />
          <SourceTargetConfig
            isTarget
            storageTypeField="targetStorageType"
            connectionIdField="targetConnectionId"
            databaseNameField="targetDatabaseName"
          />
        </Wrapper>
      </Form>
    </Formik>
  );
}
