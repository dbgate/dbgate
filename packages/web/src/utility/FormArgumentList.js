import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';
import {
  FormTextField,
  FormSubmit,
  FormArchiveFolderSelect,
  FormRow,
  FormLabel,
  FormSelectField,
  FormCheckboxField,
} from './forms';
import { Formik, Form, useFormikContext } from 'formik';

const FormArgumentsWrapper = styled.div``;

function FormArgument({ arg, namePrefix }) {
  const name = `${namePrefix}${arg.name}`;
  if (arg.type == 'text') {
    return <FormTextField label={arg.label} name={name} />;
  }
  if (arg.type == 'checkbox') {
    return <FormCheckboxField label={arg.label} name={name} />;
  }
  if (arg.type == 'select') {
    return (
      <FormSelectField label={arg.label} name={name}>
        {arg.options.map((opt) =>
          _.isString(opt) ? <option value={opt}>{opt}</option> : <option value={opt.value}>{opt.name}</option>
        )}
      </FormSelectField>
    );
  }
  return null;
}

export default function FormArgumentList({ args, onChangeValues = undefined, namePrefix }) {
  const { values } = useFormikContext();
  React.useEffect(() => {
    if (onChangeValues) onChangeValues(values);
  }, [values]);
  return (
    <FormArgumentsWrapper>
      {' '}
      {args.map((arg) => (
        <FormArgument arg={arg} key={arg.name} namePrefix={namePrefix} />
      ))}
    </FormArgumentsWrapper>
  );
}
