// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import theme from '../theme';

const ButtonDiv = styled.div`
  // height: ${theme.toolBar.height - 5}px;
  // border: 1px solid gray;
  padding: 5px;
  margin: 2px;
  //background-color: #777;
  background-color: #337ab7;
  border-color: #2e6da4;  color: white;
  border-radius: 2px;

  ${props =>
    !props.disabled &&
    `
  &:hover {
    background-color: #286090;
  }

  &:active:hover {
    background-color: #204d74;
  }
  `}

  ${props =>
    props.disabled &&
    `
    background-color: #ccc;
    color: gray;
  `}
  
`;

export default function ToolbarButton({ children, onClick, disabled = undefined }) {
  return (
    <ButtonDiv
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
    >
      {children}
    </ButtonDiv>
  );
}
