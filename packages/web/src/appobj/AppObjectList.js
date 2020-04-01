import React from 'react';
import _ from 'lodash';
import { AppObjectCore } from './AppObjects';
import { useSetOpenedTabs } from '../utility/globalState';
import styled from 'styled-components';
import { ExpandIcon } from '../icons';

const SubItemsDiv = styled.div`
  margin-left: 16px;
`;

const ExpandIconHolder2 = styled.span`
  margin-right: 5px;
  position: relative;
  top: -3px;
`;

const ExpandIconHolder = styled.span`
  margin-right: 5px;
`;

const GroupDiv = styled.div`
  user-select: none;
  padding: 5px;
  &:hover {
    background-color: lightblue;
  }
  cursor: pointer;
  white-space: nowrap;
  font-weight: bold;
`;

function AppObjectListItem({ makeAppObj, data, filter, appobj, onObjectClick, SubItems }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isHover, setIsHover] = React.useState(false);

  // const { matcher } = appobj;
  // if (matcher && !matcher(filter)) return null;
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
          <ExpandIconHolder2>
            <ExpandIcon isSelected={isHover} isExpanded={isExpanded} />
          </ExpandIconHolder2>
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

function AppObjectGroup({ group, items }) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [isHover, setIsHover] = React.useState(false);
  return (
    <>
      <GroupDiv
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ExpandIconHolder>
          <ExpandIcon isSelected={isHover} isExpanded={isExpanded} />
        </ExpandIconHolder>
        {group} {items && `(${items.filter(x => x.component).length})`}
      </GroupDiv>
      {isExpanded && items.map(x => x.component)}
    </>
  );
}

export function AppObjectList({
  list,
  makeAppObj,
  SubItems = undefined,
  onObjectClick = undefined,
  filter = undefined,
  groupFunc = undefined,
  groupOrdered = undefined,
}) {
  const setOpenedTabs = useSetOpenedTabs();

  const createComponent = (data, appobj) => (
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

  if (groupFunc) {
    const listGrouped = _.compact(
      (list || []).map(data => {
        const appobj = makeAppObj(data, { setOpenedTabs });
        const { matcher } = appobj;
        if (matcher && !matcher(filter)) return null;
        const component = createComponent(data, appobj);
        const group = groupFunc(appobj);
        return { group, appobj, component };
      })
    );
    const groups = _.groupBy(listGrouped, 'group');
    return (groupOrdered || _.keys(groups)).map(group => (
      <AppObjectGroup key={group} group={group} items={groups[group]} />
    ));
  }

  return (list || []).map(data => {
    const appobj = makeAppObj(data, { setOpenedTabs });
    const { matcher } = appobj;
    if (matcher && !matcher(filter)) return null;
    return createComponent(data, appobj);
  });
}
