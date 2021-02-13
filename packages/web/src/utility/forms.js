import React from 'react';
import Select from 'react-select';
import Creatable from 'react-select/creatable';
import { TextField, SelectField, CheckboxField } from './inputs';
import FormStyledButton from '../widgets/FormStyledButton';
import {
  useConnectionList,
  useDatabaseList,
  useDatabaseInfo,
  useArchiveFolders,
  useArchiveFiles,
} from './metadataLoaders';
import getAsArray from './getAsArray';
import axios from './axios';
import useTheme from '../theme/useTheme';
import { useForm, useFormFieldTemplate } from './FormProvider';
import { FontIcon } from '../icons';
import getElectron from './getElectron';
import InlineButton from '../widgets/InlineButton';
import styled from 'styled-components';

const FlexContainer = styled.div`
  display: flex;
`;

export function FormFieldTemplate({ label, children, type }) {
  const FieldTemplate = useFormFieldTemplate();
  return (
    <FieldTemplate label={label} type={type}>
      {children}
    </FieldTemplate>
  );
}

export function FormCondition({ condition, children }) {
  const { values } = useForm();
  if (condition(values)) return children;
  return null;
}

export function FormTextFieldRaw({ name, focused = false, ...other }) {
  const { values, setFieldValue } = useForm();
  const handleChange = event => {
    setFieldValue(name, event.target.value);
  };
  const textFieldRef = React.useRef(null);
  React.useEffect(() => {
    if (textFieldRef.current && focused) textFieldRef.current.focus();
  }, [textFieldRef.current, focused]);

  return <TextField {...other} value={values[name]} onChange={handleChange} editorRef={textFieldRef} />;
}

export function FormPasswordFieldRaw({ name, focused = false, ...other }) {
  const { values, setFieldValue } = useForm();
  const [showPassword, setShowPassword] = React.useState(false);
  const handleChange = event => {
    setFieldValue(name, event.target.value);
  };
  const textFieldRef = React.useRef(null);
  React.useEffect(() => {
    if (textFieldRef.current && focused) textFieldRef.current.focus();
  }, [textFieldRef.current, focused]);
  const value = values[name];
  const isCrypted = value && value.startsWith('crypt:');

  return (
    <>
      <TextField
        {...other}
        value={isCrypted ? '' : value}
        onChange={handleChange}
        editorRef={textFieldRef}
        placeholder={isCrypted ? '(Password is encrypted)' : undefined}
        type={isCrypted || showPassword ? 'text' : 'password'}
      />

      {!isCrypted && <FontIcon icon="icon eye" onClick={() => setShowPassword(x => !x)} />}
    </>
  );
}

export function FormTextField({ name, label, focused = false, ...other }) {
  const FieldTemplate = useFormFieldTemplate();
  return (
    <FieldTemplate label={label} type="text">
      <FormTextFieldRaw name={name} focused={focused} {...other} />
    </FieldTemplate>
  );
}

export function FormPasswordField({ name, label, focused = false, ...other }) {
  const FieldTemplate = useFormFieldTemplate();
  return (
    <FieldTemplate label={label} type="text">
      <FormPasswordFieldRaw name={name} focused={focused} {...other} />
    </FieldTemplate>
  );
}

export function FormCheckboxFieldRaw({ name = undefined, defaultValue = undefined, ...other }) {
  const { values, setFieldValue } = useForm();
  const handleChange = event => {
    setFieldValue(name, event.target.checked);
  };
  let isChecked = values[name];
  if (isChecked == null) isChecked = defaultValue;
  return <CheckboxField name={name} checked={!!isChecked} onChange={handleChange} {...other} />;
  // return <Field {...other} as={CheckboxField} />;
}

export function FormCheckboxField({ label, ...other }) {
  const FieldTemplate = useFormFieldTemplate();
  return (
    <FieldTemplate label={label} type="checkbox">
      <FormCheckboxFieldRaw {...other} />
    </FieldTemplate>
  );
}

export function FormSelectFieldRaw({ children, name, ...other }) {
  const { values, setFieldValue } = useForm();
  const handleChange = event => {
    setFieldValue(name, event.target.value);
  };
  return (
    <SelectField {...other} value={values[name]} onChange={handleChange}>
      {children}
    </SelectField>
  );
}

export function FormSelectField({ label, name, children = null, ...other }) {
  const FieldTemplate = useFormFieldTemplate();
  return (
    <FieldTemplate label={label} type="select">
      <FormSelectFieldRaw name={name} {...other}>
        {children}
      </FormSelectFieldRaw>
    </FieldTemplate>
  );
}

export function FormSubmit({ onClick, value, ...other }) {
  const { values, setSubmitAction } = useForm();
  React.useEffect(() => {
    setSubmitAction({ action: onClick });
  }, [onClick]);
  return <FormStyledButton type="submit" value={value} onClick={() => onClick(values)} {...other} />;
}

export function FormButton({ onClick, value, ...other }) {
  const { values } = useForm();
  return <FormStyledButton type="button" value={value} onClick={() => onClick(values)} {...other} />;
}

export function FormRadioGroupItem({ name, text, value }) {
  const { setFieldValue, values } = useForm();
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
  const { setFieldValue, values } = useForm();
  const theme = useTheme();

  return (
    <Component
      theme={t => ({
        ...t,
        colors: {
          ...t.colors,
          neutral0: theme.input_background,
          neutral10: theme.input_background2,
          neutral20: theme.input_background3,
          neutral30: theme.input_background4,
          neutral40: theme.input_font3,
          neutral50: theme.input_font3,
          neutral60: theme.input_font2,
          neutral70: theme.input_font2,
          neutral80: theme.input_font2,
          neutral90: theme.input_font1,
          primary: theme.input_background_blue[5],
          primary75: theme.input_background_blue[3],
          primary50: theme.input_background_blue[2],
          primary25: theme.input_background_blue[0],
          danger: theme.input_background_red[5],
          dangerLight: theme.input_background_red[1],
        },
      })}
      options={options}
      value={
        isMulti
          ? options.filter(x => values[name] && values[name].includes(x.value))
          : options.find(x => x.value == values[name])
      }
      onChange={item => setFieldValue(name, isMulti ? getAsArray(item).map(x => x.value) : item ? item.value : null)}
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
      (connections || []).map(conn => ({
        value: conn._id,
        label: conn.displayName || conn.server,
      })),
    [connections]
  );

  if (connectionOptions.length == 0) return <div>Not available</div>;
  return <FormReactSelect options={connectionOptions} name={name} />;
}

export function FormDatabaseSelect({ conidName, name }) {
  const { values } = useForm();
  const databases = useDatabaseList({ conid: values[conidName] });
  const databaseOptions = React.useMemo(
    () =>
      (databases || []).map(db => ({
        value: db.name,
        label: db.name,
      })),
    [databases]
  );

  if (databaseOptions.length == 0) return <div>Not available</div>;
  return <FormReactSelect options={databaseOptions} name={name} />;
}

export function FormSchemaSelect({ conidName, databaseName, name }) {
  const { values } = useForm();
  const dbinfo = useDatabaseInfo({ conid: values[conidName], database: values[databaseName] });
  const schemaOptions = React.useMemo(
    () =>
      ((dbinfo && dbinfo.schemas) || []).map(schema => ({
        value: schema.schemaName,
        label: schema.schemaName,
      })),
    [dbinfo]
  );

  if (schemaOptions.length == 0) return <div>Not available</div>;
  return <FormReactSelect options={schemaOptions} name={name} />;
}

export function FormTablesSelect({ conidName, databaseName, schemaName, name }) {
  const { values } = useForm();
  const dbinfo = useDatabaseInfo({ conid: values[conidName], database: values[databaseName] });
  const tablesOptions = React.useMemo(
    () =>
      [...((dbinfo && dbinfo.tables) || []), ...((dbinfo && dbinfo.views) || [])]
        .filter(x => !values[schemaName] || x.schemaName == values[schemaName])
        .map(x => ({
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
      (files || []).map(x => ({
        value: x.name,
        label: x.name,
      })),
    [files]
  );

  if (filesOptions.length == 0) return <div>Not available</div>;
  return <FormReactSelect options={filesOptions} name={name} isMulti />;
}

export function FormArchiveFolderSelect({ name, additionalFolders = [], ...other }) {
  const { setFieldValue } = useForm();
  const folders = useArchiveFolders();
  const folderOptions = React.useMemo(
    () => [
      ...(folders || []).map(folder => ({
        value: folder.name,
        label: folder.name,
      })),
      ...additionalFolders
        .filter(x => !(folders || []).find(y => y.name == x))
        .map(folder => ({
          value: folder,
          label: folder,
        })),
    ],
    [folders]
  );

  const handleCreateOption = folder => {
    axios.post('archive/create-folder', { folder });
    setFieldValue(name, folder);
  };

  return (
    <FormReactSelect
      {...other}
      options={folderOptions}
      name={name}
      Component={Creatable}
      onCreateOption={handleCreateOption}
    />
  );
}

export function FormElectronFileSelectorRaw({ name }) {
  const { values, setFieldValue } = useForm();
  const handleBrowse = () => {
    const electron = getElectron();
    if (!electron) return;
    const filePaths = electron.remote.dialog.showOpenDialogSync(electron.remote.getCurrentWindow(), {
      defaultPath: values[name],
      properties: ['showHiddenFiles'],
    });
    const filePath = filePaths && filePaths[0];
    if (filePath) setFieldValue(name, filePath);
  };
  return (
    <FlexContainer>
      <TextField value={values[name]} onClick={handleBrowse} readOnly />
      <InlineButton onClick={handleBrowse}>Browse</InlineButton>
    </FlexContainer>
  );
}

export function FormElectronFileSelector({ label, name, ...other }) {
  const FieldTemplate = useFormFieldTemplate();
  return (
    <FieldTemplate label={label} type="select">
      <FormElectronFileSelectorRaw name={name} {...other} />
    </FieldTemplate>
  );
}
