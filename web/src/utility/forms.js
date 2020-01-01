import React from 'react';
import styled from 'styled-components';
import { TextField, SelectField } from './inputs';
import { Field } from 'formik';

export const FormRow = styled.div`
  display: flex;
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
  return (
    <FormRow>
      <input type="submit" value={text} />
    </FormRow>
  );
}
