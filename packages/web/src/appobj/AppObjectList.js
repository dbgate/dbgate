import React from 'react';
import _ from 'lodash';
import { AppObjectCore } from './AppObjects';
import { useSetOpenedTabs } from '../utility/globalState';
import styled from 'styled-components';
import { ExpandIcon } from '../icons';

const SubItemsDiv = styled.div`
  margin-left: 16px;
`;

const ExpandIconHolder = styled.span`
  margin-right: 5px;
  position: relative;
  top: -3px;
`;

// function ExpandIcon({ isBlank, isExpanded, isHover }) {
//   if (column.foreignKey) {
//     return (
//       <FontIcon
//         icon={`far ${isExpanded ? 'fa-minus-square' : 'fa-plus-square'} `}
//         {...other}
//       />
//     );
//   }
//   return <FontIcon icon={`fas fa-square ${isHover ? 'lightblue' : 'white'}`} {...other} />;
// }

function AppObjectListItem({ makeAppObj, data, filter, appobj, onObjectClick, SubItems }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isHover, setIsHover] = React.useState(false);

  const { matcher } = appobj;
  if (matcher && !matcher(filter)) return null;
  if (onObjectClick) appobj.onClick = onObjectClick;
  if (SubItems) {
    appobj.onClick = () => setIsExpanded(!isExpanded);
  }

  let res = (
    <AppObjectCore
      data={data}
      makeAppObj={makeAppObj}
      {...appobj}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      prefix={
        SubItems ? (
          <ExpandIconHolder>
            <ExpandIcon isSelected={isHover} isExpanded={isExpanded} />
          </ExpandIconHolder>
        ) : null
      }
    />
  );
  if (SubItems && isExpanded) {
    res = (
      <>
        {res}
        <SubItemsDiv>
          <SubItems data={data} filter={filter} />
        </SubItemsDiv>
      </>
    );
  }
  return res;
}

export function AppObjectList({
  list,
  makeAppObj,
  SubItems = undefined,
  onObjectClick = undefined,
  filter = undefined,
}) {
  const setOpenedTabs = useSetOpenedTabs();
  return (list || []).map(data => {
    const appobj = makeAppObj(data, { setOpenedTabs });
    return (
      <AppObjectListItem
        key={appobj.key}
        appobj={appobj}
        makeAppObj={makeAppObj}
        data={data}
        filter={filter}
        onObjectClick={onObjectClick}
        SubItems={SubItems}
      />
    );
  });
}
