import React from 'react';
import useModalState from '../modals/useModalState';
import ConnectionModal from '../modals/ConnectionModal';
import styled from 'styled-components';
import theme from '../theme';

const ToolbarContainer = styled.div`
  display: flex;
  user-select: none;
`;

const ToolbarButton = styled.div`
  // height: ${theme.toolBar.height-5}px;
  // border: 1px solid gray;
  padding: 5px;
  margin: 2px;
  //background-color: #777;
  background-color: #337ab7;
  border-color: #2e6da4;  color: white;
  border-radius: 2px;

  &:hover {
    background-color: #286090;
  }

`;

export default function ToolBar() {
  const modalState = useModalState();
  return (
    <ToolbarContainer>
      <ConnectionModal modalState={modalState} />
      <ToolbarButton onClick={modalState.open}>Add connection</ToolbarButton>
    </ToolbarContainer>
  );
}
