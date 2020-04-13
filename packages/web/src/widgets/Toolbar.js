import React from 'react';
import useModalState from '../modals/useModalState';
import ConnectionModal from '../modals/ConnectionModal';
import styled from 'styled-components';
import ToolbarButton from './ToolbarButton';
import useNewQuery from '../query/useNewQuery';

const ToolbarContainer = styled.div`
  display: flex;
  user-select: none;
`;

export default function ToolBar({ toolbarPortalRef }) {
  const modalState = useModalState();
  const newQuery = useNewQuery();

  return (
    <ToolbarContainer>
      <ConnectionModal modalState={modalState} />
      <ToolbarButton onClick={modalState.open}>Add connection</ToolbarButton>
      <ToolbarButton onClick={newQuery}>New Query</ToolbarButton>
      <ToolbarContainer ref={toolbarPortalRef}></ToolbarContainer>
    </ToolbarContainer>
  );
}
