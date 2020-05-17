import React from 'react';
import useModalState from '../modals/useModalState';
import ConnectionModal from '../modals/ConnectionModal';
import styled from 'styled-components';
import ToolbarButton from './ToolbarButton';
import useNewQuery from '../query/useNewQuery';
import { useConfig } from '../utility/metadataLoaders';
import { useSetOpenedTabs } from '../utility/globalState';
import { openNewTab } from '../utility/common';

const ToolbarContainer = styled.div`
  display: flex;
  user-select: none;
`;

export default function ToolBar({ toolbarPortalRef }) {
  const modalState = useModalState();
  const newQuery = useNewQuery();
  const config = useConfig();
  const toolbar = config.toolbar || [];
  const setOpenedTabs = useSetOpenedTabs();

  return (
    <ToolbarContainer>
      <ConnectionModal modalState={modalState} />
      {toolbar.map((button) => (
        <ToolbarButton
          key={button.name}
          onClick={() => {
            openNewTab(setOpenedTabs, {
              title: button.title,
              tabComponent: 'InfoPageTab',
              icon: button.icon,
              props: {
                page: button.page,
              },
            });
          }}
          icon={button.icon}
        >
          {button.title}
        </ToolbarButton>
      ))}
      {config.runAsPortal == false && (
        <ToolbarButton onClick={modalState.open} icon="fas fa-database">
          Add connection
        </ToolbarButton>
      )}
      <ToolbarButton onClick={newQuery} icon="fas fa-file-alt">
        New Query
      </ToolbarButton>
      <ToolbarContainer ref={toolbarPortalRef}></ToolbarContainer>
    </ToolbarContainer>
  );
}
