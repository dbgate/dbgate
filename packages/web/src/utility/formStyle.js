import styled from 'styled-components';
import React from 'react';
import useTheme from '../theme/useTheme';

export const FormRow = styled.div`
  display: flex;
  margin: 10px;
`;

export const FormLabel = styled.div`
  width: 10vw;
  font-weight: bold;
`;

export const FormValue = styled.div``;

export function FormFieldTemplateDefault({ label, children, type }) {
  return (
    <FormRow>
      <FormLabel>{label}</FormLabel>
      <FormValue>{children}</FormValue>
    </FormRow>
  );
}

export const FormRowTiny = styled.div`
  margin: 5px;
`;

export const FormLabelTiny = styled.div`
  color: ${(props) => props.theme.manager_font3};
`;

export const FormValueTiny = styled.div`
  margin-left: 15px;
  margin-top: 3px;
`;

export function FormFieldTemplateTiny({ label, children, type }) {
  const theme = useTheme();
  if (type == 'checkbox') {
    return (
      <FormRowTiny>
        {children} {label}
      </FormRowTiny>
    );
  }
  return (
    <FormRowTiny>
      <FormLabelTiny theme={theme}>{label}</FormLabelTiny>
      <FormValueTiny>{children}</FormValueTiny>
    </FormRowTiny>
  );
}
