// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import theme from '../theme';

const ButtonDiv = styled.div`
  padding: 5px 15px;
  // margin: 2px;
  color: black;
  border: 0;
  border-right: 1px solid #ccc;
  height: ${theme.toolBar.height}px;

  ${(props) =>
    !props.disabled &&
    `
  &:hover {
    background-color: #CCC;
  }

  &:active:hover {
    background-color: #AAA;
  }
  `}

  ${(props) =>
    props.disabled &&
    `
    color: gray;
  `}
`;

const StyledIconSpan = styled.span`
  margin-right: 5px;
  color: ${(props) => (props.disabled ? 'gray' : 'blue')};
`;

const ButtonDivInner = styled.div`
  position: relative;
  top: ${(props) => props.patchY}px;
`;

export default function ToolbarButton({ children, onClick, icon = undefined, disabled = undefined, patchY = 2 }) {
  const Icon = icon;
  return (
    <ButtonDiv
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
    >
      <ButtonDivInner patchY={patchY}>
        {Icon && (
          <StyledIconSpan disabled={disabled}>
            <i className={icon} />
          </StyledIconSpan>
        )}
        {children}
      </ButtonDivInner>
    </ButtonDiv>
  );
}
