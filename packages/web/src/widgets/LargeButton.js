// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';
import dimensions from '../theme/dimensions';
import useTheme from '../theme/useTheme';
import { useForm } from '../utility/FormProvider';

const ButtonDiv = styled.div`
  padding: 5px 15px;
  color: ${props => props.theme.main_font1};
  border: 1px solid ${props => props.theme.border};
  width: 120px;
  height: 60px;
  background-color: ${props => props.theme.toolbar_background};

  ${props =>
    !props.disabled &&
    `
  &:hover {
    background-color: ${props.theme.toolbar_background2} ;
  }

  &:active:hover {
    background-color: ${props.theme.toolbar_background3};
  }
  `}

  ${props =>
    props.disabled &&
    `
    color: ${props.theme.main_font3};
  `}
`;

const IconDiv = styled.div`
  font-size: 30px;
  text-align: center;
`;

const ButtonDivInner = styled.div`
  text-align: center;
`;

export default function LargeButton({ children, onClick, icon = undefined, disabled = undefined }) {
  const theme = useTheme();
  return (
    <ButtonDiv
      theme={theme}
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
    >
      <IconDiv>
        <FontIcon icon={icon} />
      </IconDiv>
      <ButtonDivInner>{children}</ButtonDivInner>
    </ButtonDiv>
  );
}

export function LargeFormButton({ children, onClick, icon = undefined, disabled = undefined }) {
  const { values } = useForm();
  return (
    <LargeButton icon={icon} disabled={disabled} onClick={() => onClick(values)}>
      {children}
    </LargeButton>
  );
}
