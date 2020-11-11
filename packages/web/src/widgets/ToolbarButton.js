// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';
import dimensions from '../theme/dimensions';
import useTheme from '../theme/useTheme';

const ButtonDiv = styled.div`
  padding: 5px 15px;
  // margin: 2px;
  color: ${(props) => props.theme.mainFont};
  border: 0;
  border-right: 1px solid ${(props) => props.theme.border};
  height: ${dimensions.toolBar.height}px;

  ${(props) =>
    !props.disabled &&
    `
  &:hover {
    background-color: ${props.theme.tabsPanelBackgroundHover} ;
  }

  &:active:hover {
    background-color: ${props.theme.tabsPanelBackgroundHoverClick};
  }
  `}

  ${(props) =>
    props.disabled &&
    `
    color: ${props.theme.mainFontGray};
  `}
`;

const StyledIconSpan = styled.span`
  margin-right: 5px;
  // font-size: 18px;
  color: ${(props) => (props.disabled ? props.theme.mainFontGray : props.theme.mainFontActive)};
`;

const ButtonDivInner = styled.div`
  position: relative;
  top: ${(props) => props.patchY}px;
  white-space: nowrap;
`;

export default function ToolbarButton({ children, onClick, icon = undefined, disabled = undefined, patchY = 2 }) {
  const theme = useTheme();
  return (
    <ButtonDiv
      theme={theme}
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
    >
      <ButtonDivInner patchY={patchY}>
        {icon && (
          <StyledIconSpan disabled={disabled} theme={theme}>
            <FontIcon icon={icon} />
          </StyledIconSpan>
        )}
        {children}
      </ButtonDivInner>
    </ButtonDiv>
  );
}
