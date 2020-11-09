// @ts-nocheck

import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { showMenu } from '../modals/DropDownMenu';
import { useSetOpenedTabs, useAppObjectParams } from '../utility/globalState';
import { FontIcon } from '../icons';

const AppObjectDiv = styled.div`
  padding: 5px;
  &:hover {
    background-color: lightblue;
  }
  cursor: pointer;
  white-space: nowrap;
  font-weight: ${(props) => (props.isBold ? 'bold' : 'normal')};
`;

const AppObjectSpan = styled.span`
  white-space: nowrap;
  font-weight: ${(props) => (props.isBold ? 'bold' : 'normal')};
`;

const IconWrap = styled.span`
  margin-right: 10px;
`;

const StatusIconWrap = styled.span`
  margin-left: 5px;
`;

export function AppObjectCore({
  title,
  Icon,
  Menu,
  data,
  makeAppObj,
  onClick,
  isBold,
  isBusy,
  component = 'div',
  prefix = null,
  statusIcon,
  statusTitle,
  ...other
}) {
  const appObjectParams = useAppObjectParams();

  const handleContextMenu = (event) => {
    if (!Menu) return;

    event.preventDefault();
    showMenu(event.pageX, event.pageY, <Menu data={data} makeAppObj={makeAppObj} {...appObjectParams} />);
  };

  const Component = component == 'div' ? AppObjectDiv : AppObjectSpan;

  let bold = false;
  if (_.isFunction(isBold)) bold = isBold(appObjectParams);
  else bold = !!isBold;

  return (
    <Component
      onContextMenu={handleContextMenu}
      onClick={onClick ? () => onClick(data) : undefined}
      isBold={bold}
      {...other}
    >
      {prefix}
      <IconWrap>{isBusy ? <span className="mdi mdi-loading mdi-spin"></span> : <Icon />}</IconWrap>
      {title}
      {statusIcon && (
        <StatusIconWrap>
          <span className={statusIcon} title={statusTitle} />
        </StatusIconWrap>
      )}
    </Component>
  );
}

export function AppObjectControl({ data, makeAppObj, component = 'div' }) {
  const appObjectParams = useAppObjectParams();
  const appobj = makeAppObj(data, appObjectParams);
  return <AppObjectCore {...appobj} data={data} makeAppObj={makeAppObj} component={component} />;
}
