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
  FormSelectField,
  FormSchemaSelect,
} from '../utility/forms';
import { useConnectionList, useDatabaseList, useDatabaseInfo } from '../utility/metadataLoaders';
import TableControl, { TableColumn } from '../utility/TableControl';
import { TextField, SelectField } from '../utility/inputs';
import { getActionOptions, getTargetName } from './createImpExpScript';

const Container = styled.div``;

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
  direction,
  storageTypeField,
  connectionIdField,
  databaseNameField,
  schemaNameField,
  tablesField = undefined,
}) {
  const types = [
    { value: 'database', label: 'Database', directions: ['source', 'target'] },
    { value: 'csv', label: 'CSV file(s)', directions: ['target'] },
    { value: 'jsonl', label: 'JSON lines file(s)', directions: ['target'] },
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
          <Label>Schema</Label>
          <FormSchemaSelect conidName={connectionIdField} databaseName={databaseNameField} name={schemaNameField} />
          {tablesField && (
            <>
              <Label>Tables/views</Label>
              <FormTablesSelect
                conidName={connectionIdField}
                schemaName={schemaNameField}
                databaseName={databaseNameField}
                name={tablesField}
              />
            </>
          )}
        </>
      )}
    </Column>
  );
}

export default function ImportExportConfigurator() {
  const { values, setFieldValue } = useFormikContext();
  const targetDbinfo = useDatabaseInfo({ conid: values.targetConnectionId, database: values.targetDatabaseName });
  const { sourceList } = values;

  return (
    <Container>
      <Wrapper>
        <SourceTargetConfig
          direction="source"
          storageTypeField="sourceStorageType"
          connectionIdField="sourceConnectionId"
          databaseNameField="sourceDatabaseName"
          schemaNameField="sourceSchemaName"
          tablesField="sourceList"
        />
        <SourceTargetConfig
          direction="target"
          storageTypeField="targetStorageType"
          connectionIdField="targetConnectionId"
          databaseNameField="targetDatabaseName"
          schemaNameField="targetSchemaName"
        />
      </Wrapper>
      <TableControl rows={sourceList || []}>
        <TableColumn fieldName="source" header="Source" formatter={(row) => row} />
        <TableColumn
          fieldName="action"
          header="Action"
          formatter={(row) => (
            <SelectField
              options={getActionOptions(row, values, targetDbinfo)}
              value={values[`actionType_${row}`] || getActionOptions(row, values, targetDbinfo)[0].value}
              onChange={(e) => setFieldValue(`actionType_${row}`, e.target.value)}
            />
          )}
        />
        <TableColumn
          fieldName="target"
          header="Target"
          formatter={(row) => (
            <TextField
              value={getTargetName(row, values)}
              onChange={(e) => setFieldValue(`targetName_${row}`, e.target.value)}
            />
          )}
        />
      </TableControl>
    </Container>
  );
}
