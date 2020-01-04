import React from 'react';
import styled from 'styled-components';
import { showMenu } from '../modals/DropDownMenu';

const AppObjectDiv = styled.div`
  padding: 5px;
  &:hover {
    background-color: lightblue;
  };
  cursor: pointer;
`;

const IconWrap = styled.span`
  margin-right: 10px;
`;

export function AppObjectCore({ title, Icon, Menu, data, makeAppObj }) {
  const handleContextMenu = event => {
    if (!Menu) return;

    event.preventDefault();
    showMenu(event.pageX, event.pageY, <Menu data={data} makeAppObj={makeAppObj} />);
  };

  return (
    <AppObjectDiv onContextMenu={handleContextMenu}>
      <IconWrap>
        <Icon />
      </IconWrap>
      {title}
    </AppObjectDiv>
  );
}

export function AppObjectControl({ data, makeAppObj }) {
  const appobj = makeAppObj(data);
  return <AppObjectCore {...appobj} data={data} makeAppObj={makeAppObj} />;
}

export function AppObjectList({ list, makeAppObj }) {
  return (list || []).map(x => {
    const appobj = makeAppObj(x);
    return <AppObjectCore key={appobj.key} {...appobj} data={x} makeAppObj={makeAppObj} />;
  });
}
