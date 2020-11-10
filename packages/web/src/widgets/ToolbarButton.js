// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';
import dimensions from '../theme/dimensions';

const ButtonDiv = styled.div`
  padding: 5px 15px;
  // margin: 2px;
  color: black;
  border: 0;
  border-right: 1px solid #ccc;
  height: ${dimensions.toolBar.height}px;

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
  // font-size: 18px;
  color: ${(props) => (props.disabled ? 'gray' : 'blue')};
`;

const ButtonDivInner = styled.div`
  position: relative;
  top: ${(props) => props.patchY}px;
  white-space: nowrap;
`;

export default function ToolbarButton({ children, onClick, icon = undefined, disabled = undefined, patchY = 2 }) {
  return (
    <ButtonDiv
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
    >
      <ButtonDivInner patchY={patchY}>
        {icon && (
          <StyledIconSpan disabled={disabled}>
            <FontIcon icon={icon} />
          </StyledIconSpan>
        )}
        {children}
      </ButtonDivInner>
    </ButtonDiv>
  );
}
