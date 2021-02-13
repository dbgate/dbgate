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

export function FormFieldTemplateDefault({ label, children, onLabelClick, type }) {
  return (
    <FormRow>
      <FormLabel onClick={onLabelClick}>{label}</FormLabel>
      <FormValue>{children}</FormValue>
    </FormRow>
  );
}

export const FormRowTiny = styled.div`
  margin: 5px;
`;

export const FormLabelTiny = styled.div`
  color: ${props => props.theme.manager_font3};
`;

export const FormValueTiny = styled.div`
  margin-left: 15px;
  margin-top: 3px;
`;

export function FormFieldTemplateTiny({ label, children, onLabelClick, type }) {
  const theme = useTheme();
  if (type == 'checkbox') {
    return (
      <FormRowTiny>
        {children} <span onClick={onLabelClick}>{label}</span>
      </FormRowTiny>
    );
  }
  return (
    <FormRowTiny>
      <FormLabelTiny theme={theme} onClick={onLabelClick}>
        {label}
      </FormLabelTiny>
      <FormValueTiny>{children}</FormValueTiny>
    </FormRowTiny>
  );
}

const FormRowLargeTemplate = styled.div`
  ${props =>
    // @ts-ignore
    !props.noMargin &&
    `
  margin: 20px;
  `}
`;

export const FormRowLarge = styled.div`
  margin: 20px;
  display: flex;
`;

export const FormLabelLarge = styled.div`
  margin-bottom: 3px;
  color: ${props => props.theme.manager_font3};
`;

export const FormValueLarge = styled.div``;

export function FormFieldTemplateLarge({ label, onLabelClick, children, type, noMargin = false }) {
  const theme = useTheme();
  if (type == 'checkbox') {
    return (
      <FormRowLargeTemplate
        // @ts-ignore
        noMargin={noMargin}
      >
        {children} <span onClick={onLabelClick}>{label}</span>
      </FormRowLargeTemplate>
    );
  }
  return (
    <FormRowLargeTemplate
      className="largeFormMarker"
      // @ts-ignore
      noMargin={noMargin}
    >
      <FormLabelLarge theme={theme} onClick={onLabelClick}>
        {label}
      </FormLabelLarge>
      <FormValueLarge>{children}</FormValueLarge>
    </FormRowLargeTemplate>
  );
}
