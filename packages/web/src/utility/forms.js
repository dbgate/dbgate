import React from 'react';
import styled from 'styled-components';
import Select from 'react-select';
import Creatable from 'react-select/creatable';
import { TextField, SelectField } from './inputs';
import { Field, useFormikContext } from 'formik';
import FormStyledButton from '../widgets/FormStyledButton';
import {
  useConnectionList,
  useDatabaseList,
  useDatabaseInfo,
  useArchiveFolders,
  useArchiveFiles,
} from './metadataLoaders';
import useSocket from './SocketProvider';
import getAsArray from './getAsArray';
import axios from './axios';

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

export function FormSelectField({ label, children = null, ...other }) {
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

export function FormReactSelect({ options, name, isMulti = false, Component = Select, ...other }) {
  const { setFieldValue, values } = useFormikContext();

  return (
    <Component
      options={options}
      value={
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
      {...other}
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

export function FormSchemaSelect({ conidName, databaseName, name }) {
  const { values } = useFormikContext();
  const dbinfo = useDatabaseInfo({ conid: values[conidName], database: values[databaseName] });
  const schemaOptions = React.useMemo(
    () =>
      ((dbinfo && dbinfo.schemas) || []).map((schema) => ({
        value: schema.schemaName,
        label: schema.schemaName,
      })),
    [dbinfo]
  );

  if (schemaOptions.length == 0) return <div>Not available</div>;
  return <FormReactSelect options={schemaOptions} name={name} />;
}

export function FormTablesSelect({ conidName, databaseName, schemaName, name }) {
  const { values } = useFormikContext();
  const dbinfo = useDatabaseInfo({ conid: values[conidName], database: values[databaseName] });
  const tablesOptions = React.useMemo(
    () =>
      [...((dbinfo && dbinfo.tables) || []), ...((dbinfo && dbinfo.views) || [])]
        .filter((x) => !values[schemaName] || x.schemaName == values[schemaName])
        .map((x) => ({
          value: x.pureName,
          label: x.pureName,
        })),
    [dbinfo, values[schemaName]]
  );

  if (tablesOptions.length == 0) return <div>Not available</div>;
  return <FormReactSelect options={tablesOptions} name={name} isMulti />;
}

export function FormArchiveFilesSelect({ folderName, name }) {
  // const { values } = useFormikContext();
  const files = useArchiveFiles({ folder: folderName });
  const filesOptions = React.useMemo(
    () =>
      (files || []).map((x) => ({
        value: x.name,
        label: x.name,
      })),
    [files]
  );

  if (filesOptions.length == 0) return <div>Not available</div>;
  return <FormReactSelect options={filesOptions} name={name} isMulti />;
}

export function FormArchiveFolderSelect({ name }) {
  const { setFieldValue } = useFormikContext();
  const folders = useArchiveFolders();
  const folderOptions = React.useMemo(
    () =>
      (folders || []).map((folder) => ({
        value: folder.name,
        label: folder.name,
      })),
    [folders]
  );

  const handleCreateOption = (folder) => {
    axios.post('archive/create-folder', { folder });
    setFieldValue(name, folder);
  };

  return (
    <FormReactSelect options={folderOptions} name={name} Component={Creatable} onCreateOption={handleCreateOption} />
  );
}
