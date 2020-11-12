// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import dimensions from '../theme/dimensions';
import useTheme from '../theme/useTheme';

const ButtonInput = styled.input`
  // height: ${dimensions.toolBar.height - 5}px;
  border: 1px solid ${(props) => props.theme.button_background2};
  padding: 5px;
  margin: 2px;
  width: 100px;
  background-color: ${(props) => props.theme.button_background};
  color: ${(props) => props.theme.button_font1};
  border-radius: 2px;

  ${(props) =>
    !props.disabled &&
    `
  &:hover {
    background-color: ${props.theme.button_background2};
  }

  &:active:hover {
    background-color: ${props.theme.button_background3};
  }
  `}

  ${(props) =>
    props.disabled &&
    `
    background-color: ${props.theme.button_background3};
    color: ${props.theme.button_font3} ;
  `}
`;

// ${props.theme.button_background_gray[1]};

export default function FormStyledButton({
  onClick = undefined,
  type = 'button',
  value,
  disabled = undefined,
  ...other
}) {
  const theme = useTheme();
  return (
    <ButtonInput
      type={type}
      theme={theme}
      onClick={
        onClick
          ? () => {
              if (!disabled && onClick) onClick();
            }
          : undefined
      }
      disabled={disabled}
      value={value}
      {...other}
    />
  );
}
