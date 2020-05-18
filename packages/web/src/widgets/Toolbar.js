import React from 'react';
import useModalState from '../modals/useModalState';
import ConnectionModal from '../modals/ConnectionModal';
import styled from 'styled-components';
import ToolbarButton from './ToolbarButton';
import useNewQuery from '../query/useNewQuery';
import { useConfig } from '../utility/metadataLoaders';
import { useSetOpenedTabs, useOpenedTabs } from '../utility/globalState';
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
  const openedTabs = useOpenedTabs();

  React.useEffect(() => {
    window['dbgate_createNewConnection'] = modalState.open;
    window['dbgate_newQuery'] = newQuery;
    window['dbgate_closeAll'] = () => setOpenedTabs([]);
  });

  function openTabFromButton(button) {
    if (openedTabs.find((x) => x.tabComponent == 'InfoPageTab' && x.props && x.props.page == button.page)) {
      setOpenedTabs((tabs) =>
        tabs.map((tab) => ({
          ...tab,
          selected: tab.tabComponent == 'InfoPageTab' && tab.props && tab.props.page == button.page,
        }))
      );
    } else {
      openNewTab(setOpenedTabs, {
        title: button.title,
        tabComponent: 'InfoPageTab',
        icon: button.icon,
        props: {
          page: button.page,
        },
      });
    }
  }

  React.useEffect(() => {
    if (config.startupPages) {
      for (const page of config.startupPages) {
        const button = toolbar.find((x) => x.name == page);
        if (button) {
          openTabFromButton(button);
        }
      }
    }
  }, config && config.startupPages);

  return (
    <ToolbarContainer>
      <ConnectionModal modalState={modalState} />
      {toolbar.map((button) => (
        <ToolbarButton key={button.name} onClick={() => openTabFromButton(button)} icon={button.icon}>
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
