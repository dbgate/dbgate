import React from 'react';
import styled from 'styled-components';
import Select from 'react-select';
import { TextField, SelectField } from './inputs';
import { Field, useFormikContext } from 'formik';
import FormStyledButton from '../widgets/FormStyledButton';
import { useConnectionList, useDatabaseList, useDatabaseInfo } from './metadataLoaders';
import useSocket from './SocketProvider';
import getAsArray from './getAsArray';

export const FormRow = styled.div`
  display: flex;
  margin: 10px;
`;

export const FormButtonRow = styled.div`
  display: flex;
  // justify-content: flex-end;
  margin: 10px;
`;

export const FormLabel = styled.div`
  width: 10vw;
  font-weight: bold;
`;

export const FormValue = styled.div``;

export function FormTextFieldRaw({ ...other }) {
  return <Field {...other} as={TextField} />;
}

export function FormTextField({ label, ...other }) {
  return (
    <FormRow>
      <FormLabel>{label}</FormLabel>
      <FormValue>
        <FormTextFieldRaw {...other} />
      </FormValue>
    </FormRow>
  );
}

export function FormSelectFieldRaw({ children, ...other }) {
  return (
    <Field {...other} as={SelectField}>
      {children}
    </Field>
  );
}

export function FormSelectField({ label, children, ...other }) {
  return (
    <FormRow>
      <FormLabel>{label}</FormLabel>
      <FormValue>
        <FormSelectFieldRaw {...other}>{children}</FormSelectFieldRaw>
      </FormValue>
    </FormRow>
  );
}

export function FormSubmit({ text }) {
  return <FormStyledButton type="submit" value={text} />;
}

export function FormButton({ text, onClick, ...other }) {
  const { values } = useFormikContext();
  return <FormStyledButton type="button" value={text} onClick={() => onClick(values)} {...other} />;
}

export function FormRadioGroupItem({ name, text, value }) {
  const { setFieldValue, values } = useFormikContext();
  return (
    <div>
      <input
        type="radio"
        name={name}
        id={`${name}_${value}`}
        defaultChecked={values[name] == value}
        onClick={() => setFieldValue(name, value)}
      />
      <label htmlFor={`multiple_values_option_${value}`}>{text}</label>
    </div>
  );
}

export function FormReactSelect({ options, name, isMulti = false }) {
  const { setFieldValue, values } = useFormikContext();

  return (
    <Select
      options={options}
      defaultValue={
        isMulti
          ? options.filter((x) => values[name] && values[name].includes(x.value))
          : options.find((x) => x.value == values[name])
      }
      onChange={(item) =>
        setFieldValue(name, isMulti ? getAsArray(item).map((x) => x.value) : item ? item.value : null)
      }
      menuPortalTarget={document.body}
      isMulti={isMulti}
      closeMenuOnSelect={!isMulti}
    />
  );
}

export function FormConnectionSelect({ name }) {
  const connections = useConnectionList();
  const connectionOptions = React.useMemo(
    () =>
      (connections || []).map((conn) => ({
        value: conn._id,
        label: conn.displayName || conn.server,
      })),
    [connections]
  );

  if (connectionOptions.length == 0) return <div>Not available</div>;
  return <FormReactSelect options={connectionOptions} name={name} />;
}

export function FormDatabaseSelect({ conidName, name }) {
  const { values } = useFormikContext();
  const databases = useDatabaseList({ conid: values[conidName] });
  const databaseOptions = React.useMemo(
    () =>
      (databases || []).map((db) => ({
        value: db.name,
        label: db.name,
      })),
    [databases]
  );

  if (databaseOptions.length == 0) return <div>Not available</div>;
  return <FormReactSelect options={databaseOptions} name={name} />;
}

export function FormTablesSelect({ conidName, databaseName, name }) {
  const { values } = useFormikContext();
  const dbinfo = useDatabaseInfo({ conid: values[conidName], database: values[databaseName] });
  const tablesOptions = React.useMemo(
    () =>
      [...((dbinfo && dbinfo.tables) || []), ...((dbinfo && dbinfo.views) || [])].map((x) => ({
        value: `${x.schemaName}.${x.pureName}`,
        label: x.pureName,
      })),
    [dbinfo]
  );

  if (tablesOptions.length == 0) return <div>Not available</div>;
  return <FormReactSelect options={tablesOptions} name={name} isMulti />;
}
