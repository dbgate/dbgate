import _ from 'lodash';
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
  flex-shrink: 1;
  flex-grow: 0;
  min-width: 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  &:hover {
    color: ${theme.tabsPanel.hoverFont};
  }
  background-color: ${(props) =>
    // @ts-ignore
    props.selected ? theme.mainArea.background : 'inherit'};
`;

const FileNameWrapper = styled.span`
  margin-left: 5px;
`;

const CloseButton = styled.i`
  margin-left: 5px;
  color: gray;
  &:hover {
    color: ${theme.tabsPanel.hoverFont};
  }
`;

export default function TabsPanel() {
  const tabs = useOpenedTabs();
  const setOpenedTabs = useSetOpenedTabs();

  const handleTabClick = (e, tabid) => {
    if (e.target.closest('.tabCloseButton')) {
      return;
    }
    setOpenedTabs((files) =>
      files.map((x) => ({
        ...x,
        selected: x.tabid == tabid,
      }))
    );
  };
  const closeTab = (tabid) => {
    setOpenedTabs((files) => {
      let index = _.findIndex(files, (x) => x.tabid == tabid);
      const newFiles = files.filter((x) => x.tabid != tabid);

      if (!newFiles.find((x) => x.selected)) {
        if (index >= newFiles.length) index -= 1;
        if (index >= 0) newFiles[index].selected = true;
      }

      return newFiles;
    });
  };
  const handleMouseUp = (e, tabid) => {
    if (e.button == 1) {
      closeTab(tabid);
    }
  };
  // console.log(
  //   't',
  //   tabs.map(x => x.tooltip)
  // );

  return (
    <>
      {tabs.map((tab) => (
        <FileTabItem
          {...tab}
          title={tab.tooltip}
          key={tab.tabid}
          onClick={(e) => handleTabClick(e, tab.tabid)}
          onMouseUp={(e) => handleMouseUp(e, tab.tabid)}
        >
          {getIconImage(tab.icon)}
          <FileNameWrapper>{tab.title}</FileNameWrapper>
          <CloseButton
            className="fas fa-times tabCloseButton"
            onClick={(e) => {
              e.preventDefault();
              closeTab(tab.tabid);
            }}
          />
        </FileTabItem>
      ))}
    </>
  );
}
