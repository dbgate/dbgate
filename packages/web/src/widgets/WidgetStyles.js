// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import theme from '../theme';
import { useLeftPanelWidth } from '../utility/globalState';

export const SearchBoxWrapper = styled.div`
  display: flex;
  margin-bottom: 5px;
`;

export const WidgetsMainContainer = styled.div`
  position: relative;
  display: flex;
  flex-flow: column wrap;
  flex: 1;
  flex-direction: column;
  user-select: none;
`;

const StyledWidgetsOuterContainer = styled.div`
  flex: 1 1 0;
  overflow: hidden;
  width: ${(props) => props.leftPanelWidth}px;
  position: relative;
  flex-direction: column;
  display: flex;
`;

export function WidgetsOuterContainer({ children }) {
  const leftPanelWidth = useLeftPanelWidth();
  return <StyledWidgetsOuterContainer leftPanelWidth={leftPanelWidth}>{children}</StyledWidgetsOuterContainer>;
}

export const StyledWidgetsInnerContainer = styled.div`
  flex: 1 1;
  overflow: scroll;
  width: ${(props) => props.leftPanelWidth}px;
`;

export function WidgetsInnerContainer({ children }) {
  const leftPanelWidth = useLeftPanelWidth();
  return <StyledWidgetsInnerContainer leftPanelWidth={leftPanelWidth}>{children}</StyledWidgetsInnerContainer>;
}

// export const Input = styled.input`
//   flex: 1;
//   min-width: 90px;
// `;

const StyledWidgetTitle = styled.div`
  padding: 5px;
  font-weight: bold;
  text-transform: uppercase;
  background-color: gray;
  // background-color: #CEC;
`;

export function WidgetTitle({ children, inputRef = undefined }) {
  return (
    <StyledWidgetTitle
      onClick={() => {
        if (inputRef && inputRef.current) inputRef.current.focus();
      }}
    >
      {children}
    </StyledWidgetTitle>
  );
}
