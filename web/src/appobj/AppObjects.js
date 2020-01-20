import React from 'react';
import styled from 'styled-components';
import { showMenu } from '../modals/DropDownMenu';
import { useSetOpenedFiles } from '../utility/globalState';

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
  const handleContextMenu = event => {
    if (!Menu) return;

    event.preventDefault();
    showMenu(event.pageX, event.pageY, <Menu data={data} makeAppObj={makeAppObj} />);
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
  const setOpenedFiles = useSetOpenedFiles();
  const appobj = makeAppObj(data, { setOpenedFiles });
  return <AppObjectCore {...appobj} data={data} makeAppObj={makeAppObj} />;
}
