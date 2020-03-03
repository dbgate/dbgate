import React from 'react';
import styled from 'styled-components';
import theme from './theme';

import { useOpenedTabs, useSetOpenedTabs } from './utility/globalState';
import { getIconImage } from './icons';

// const files = [
//   { name: 'app.js' },
//   { name: 'BranchCategory', type: 'table', selected: true },
//   { name: 'ApplicationList' },
// ];

const FileTabItem = styled.div`
  border-right: 1px solid white;
  padding-left: 15px;
  padding-right: 15px;
  display: flex;
  align-items: center;
  cursor: pointer;
  &:hover {
    color: ${theme.tabsPanel.hoverFont};
  }
  background-color: ${props =>
    // @ts-ignore
    props.selected ? theme.mainArea.background : 'inherit'};
`;

const FileNameWrapper = styled.span`
  margin-left: 5px;
`;

export default function TabsPanel() {
  const tabs = useOpenedTabs();
  const setOpenedTabs = useSetOpenedTabs();

  const handleTabClick = tabid => {
    setOpenedTabs(files =>
      files.map(x => ({
        ...x,
        selected: x.tabid == tabid,
      }))
    );
  };
  const handleMouseUp = (e, tabid) => {
    if (e.button == 1) {
      setOpenedTabs(files => files.filter(x => x.tabid != tabid));
    }
  };
  console.log(
    't',
    tabs.map(x => x.tooltip)
  );

  return (
    <>
      {tabs.map(tab => (
        <FileTabItem
          {...tab}
          title={tab.tooltip}
          key={tab.tabid}
          onClick={() => handleTabClick(tab.tabid)}
          onMouseUp={e => handleMouseUp(e, tab.tabid)}
        >
          {getIconImage(tab.icon)}
          <FileNameWrapper>{tab.title}</FileNameWrapper>
        </FileTabItem>
      ))}
    </>
  );
}
