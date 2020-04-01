// @ts-nocheck

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

const AppObjectSpan = styled.span`
  white-space: nowrap;
  font-weight: ${props => (props.isBold ? 'bold' : 'normal')};
`;

const IconWrap = styled.span`
  margin-right: 10px;
`;

export function AppObjectCore({
  title,
  Icon,
  Menu,
  data,
  makeAppObj,
  onClick,
  isBold,
  component = 'div',
  prefix = null,
  ...other
}) {
  const setOpenedTabs = useSetOpenedTabs();

  const handleContextMenu = event => {
    if (!Menu) return;

    event.preventDefault();
    showMenu(event.pageX, event.pageY, <Menu data={data} makeAppObj={makeAppObj} setOpenedTabs={setOpenedTabs} />);
  };

  const Component = component == 'div' ? AppObjectDiv : AppObjectSpan;

  return (
    <Component
      onContextMenu={handleContextMenu}
      onClick={onClick ? () => onClick(data) : undefined}
      isBold={isBold}
      {...other}
    >
      {prefix}
      <IconWrap>
        <Icon />
      </IconWrap>
      {title}
    </Component>
  );
}

export function AppObjectControl({ data, makeAppObj, component = 'div' }) {
  const setOpenedTabs = useSetOpenedTabs();
  const appobj = makeAppObj(data, { setOpenedTabs });
  return <AppObjectCore {...appobj} data={data} makeAppObj={makeAppObj} component={component} />;
}
