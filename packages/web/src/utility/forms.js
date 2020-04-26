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

export function FormTextField({ label, ...other }) {
  return (
    <FormRow>
      <FormLabel>{label}</FormLabel>
      <FormValue>
        <Field {...other} as={TextField} />
      </FormValue>
    </FormRow>
  );
}

export function FormSelectField({ label, children, ...other }) {
  return (
    <FormRow>
      <FormLabel>{label}</FormLabel>
      <FormValue>
        <Field {...other} as={SelectField}>
          {children}
        </Field>
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
