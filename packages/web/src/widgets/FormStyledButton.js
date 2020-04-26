// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import theme from '../theme';

const ButtonInput = styled.input`
  // height: ${theme.toolBar.height - 5}px;
   border: 1px solid #2e6da4;
  padding: 5px;
  margin: 2px;
  width: 100px;
  //background-color: #777;
  background-color: #337ab7;
  // border-color: #2e6da4; 
  color: white;
  border-radius: 2px;

  ${(props) =>
    !props.disabled &&
    `
  &:hover {
    background-color: #286090;
  }

  &:active:hover {
    background-color: #204d74;
  }
  `}

  ${(props) =>
    props.disabled &&
    `
    background-color: #ccc;
    color: gray;
  `}
  
`;

export default function FormStyledButton({
  onClick = undefined,
  type = 'button',
  value,
  disabled = undefined,
  ...other
}) {
  return (
    <ButtonInput
      type={type}
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
