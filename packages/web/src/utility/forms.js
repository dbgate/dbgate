import React from 'react';
import styled from 'styled-components';
import { TextField, SelectField } from './inputs';
import { Field, useFormikContext } from 'formik';
import FormStyledButton from '../widgets/FormStyledButton';

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
