import React from 'react';
import styled from 'styled-components';
import theme from './theme';

import { TableIcon } from './icons';
import { useOpenedTabs, useSetOpenedTabs } from './utility/globalState';

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
  const files = useOpenedTabs();
  const setOpenedTabs = useSetOpenedTabs();

  const handleTabClick = id => {
    setOpenedTabs(files =>
      files.map(x => ({
        ...x,
        selected: x.id == id,
      }))
    );
  };
  const handleMouseUp = (e, id) => {
    if (e.button == 1) {
      setOpenedTabs(files => files.filter(x => x.id != id));
    }
  };
  return (
    <>
      {files.map(file => (
        <FileTabItem
          {...file}
          key={file.id}
          onClick={() => handleTabClick(file.id)}
          onMouseUp={e => handleMouseUp(e, file.id)}
        >
          <TableIcon />
          <FileNameWrapper>{file.name}</FileNameWrapper>
        </FileTabItem>
      ))}
    </>
  );
}
