import React from 'react';
import styled from 'styled-components';
import { showMenu } from '../modals/DropDownMenu';
import { useSetOpenedTabs } from '../utility/globalState';

const AppObjectDiv = styled.div`
  padding: 5px;
  &:hover {
    background-color: lightblue;
  }
  cursor: pointer;
  white-space: nowrap;
`;

const IconWrap = styled.span`
  margin-right: 10px;
`;

export function AppObjectCore({ title, Icon, Menu, data, makeAppObj, onClick }) {
  const setOpenedTabs = useSetOpenedTabs();

  const handleContextMenu = event => {
    if (!Menu) return;

    event.preventDefault();
    showMenu(event.pageX, event.pageY, <Menu data={data} makeAppObj={makeAppObj} setOpenedTabs={setOpenedTabs} />);
  };

  return (
    <AppObjectDiv onContextMenu={handleContextMenu} onClick={onClick ? () => onClick(data) : undefined}>
      <IconWrap>
        <Icon />
      </IconWrap>
      {title}
    </AppObjectDiv>
  );
}

export function AppObjectControl({ data, makeAppObj }) {
  const setOpenedTabs = useSetOpenedTabs();
  const appobj = makeAppObj(data, { setOpenedTabs });
  return <AppObjectCore {...appobj} data={data} makeAppObj={makeAppObj} />;
}
