// @ts-nocheck

import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';
import { useShowMenu } from '../modals/showMenu';
// import { showMenu } from '../modals/DropDownMenu';
import useTheme from '../theme/useTheme';
// import { useSetOpenedTabs, useAppObjectParams } from '../utility/globalState';

const AppObjectDiv = styled.div`
  padding: 5px;
  &:hover {
    background-color: ${(props) => props.theme.left_background_blue[1]};
  }
  cursor: pointer;
  white-space: nowrap;
  font-weight: ${(props) => (props.isBold ? 'bold' : 'normal')};
`;

// const AppObjectSpan = styled.span`
//   white-space: nowrap;
//   font-weight: ${(props) => (props.isBold ? 'bold' : 'normal')};
// `;

const IconWrap = styled.span`
  margin-right: 5px;
`;

const StatusIconWrap = styled.span`
  margin-left: 5px;
`;

const ExtInfoWrap = styled.span`
  font-weight: normal;
  margin-left: 5px;
  color: ${(props) => props.theme.left_font3};
`;

export function AppObjectCore({
  title,
  icon,
  data,
  // makeAppObj,
  onClick = undefined,
  onClick2 = undefined,
  onClick3 = undefined,
  isBold = undefined,
  isBusy = undefined,
  // component = 'div',
  prefix = undefined,
  statusIcon = undefined,
  extInfo = undefined,
  statusTitle = undefined,
  Menu = undefined,
  ...other
}) {
  // const appObjectParams = useAppObjectParams();
  const theme = useTheme();
  const showMenu = useShowMenu();

  const handleContextMenu = (event) => {
    if (!Menu) return;

    event.preventDefault();
    showMenu(event.pageX, event.pageY, <Menu data={data} />);
    // showMenu(event.pageX, event.pageY, <Menu data={data} makeAppObj={makeAppObj} {...appObjectParams} />);
  };

  // const Component = component == 'div' ? AppObjectDiv : AppObjectSpan;

  // let bold = false;
  // if (_.isFunction(isBold)) bold = isBold(appObjectParams);
  // else bold = !!isBold;

  return (
    <AppObjectDiv
      onContextMenu={handleContextMenu}
      onClick={() => {
        if (onClick) onClick(data);
        if (onClick2) onClick2(data);
        if (onClick3) onClick3(data);
      }}
      theme={theme}
      isBold={isBold}
      {...other}
    >
      {prefix}
      <IconWrap>{isBusy ? <FontIcon icon="icon loading" /> : <FontIcon icon={icon} />}</IconWrap>
      {title}
      {statusIcon && (
        <StatusIconWrap>
          <FontIcon icon={statusIcon} title={statusTitle} />
        </StatusIconWrap>
      )}
      {extInfo && <ExtInfoWrap theme={theme}>{extInfo}</ExtInfoWrap>}
    </AppObjectDiv>
  );
}

// export function AppObjectControl({ data, makeAppObj, component = 'div' }) {
//   const appObjectParams = useAppObjectParams();
//   const appobj = makeAppObj(data, appObjectParams);
//   return <AppObjectCore {...appobj} data={data} makeAppObj={makeAppObj} component={component} />;
// }
