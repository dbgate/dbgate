import React from 'react';
import FormStyledButton from '../widgets/FormStyledButton';
import { Formik, Form, useFormik, useFormikContext } from 'formik';
import styled from 'styled-components';
import Select from 'react-select';
import { FontIcon } from '../icons';
import {
  FormButtonRow,
  FormSubmit,
  FormReactSelect,
  FormConnectionSelect,
  FormDatabaseSelect,
  FormTablesSelect,
} from '../utility/forms';
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

function SourceTargetConfig({ direction, storageTypeField, connectionIdField, databaseNameField, tablesField }) {
  const types = [
    { value: 'database', label: 'Database', directions: ['source'] },
    { value: 'csv', label: 'CSV file(s)', directions: ['target'] },
    { value: 'json', label: 'JSON file(s)', directions: [] },
  ];
  const { values } = useFormikContext();
  return (
    <Column>
      {direction == 'source' && <Label>Source configuration</Label>}
      {direction == 'target' && <Label>Target configuration</Label>}
      <FormReactSelect options={types.filter((x) => x.directions.includes(direction))} name={storageTypeField} />
      {values[storageTypeField] == 'database' && (
        <>
          <Label>Server</Label>
          <FormConnectionSelect name={connectionIdField} />
          <Label>Database</Label>
          <FormDatabaseSelect conidName={connectionIdField} name={databaseNameField} />
          <Label>Tables/views</Label>
          <FormTablesSelect conidName={connectionIdField} databaseName={databaseNameField} name={tablesField} />
        </>
      )}
    </Column>
  );
}

export default function ImportExportConfigurator() {
  return (
    <Wrapper>
      <SourceTargetConfig
        direction="source"
        storageTypeField="sourceStorageType"
        connectionIdField="sourceConnectionId"
        databaseNameField="sourceDatabaseName"
        tablesField="sourceTables"
      />
      <SourceTargetConfig
        direction="target"
        storageTypeField="targetStorageType"
        connectionIdField="targetConnectionId"
        databaseNameField="targetDatabaseName"
        tablesField="targetTables"
      />
    </Wrapper>
  );
}
