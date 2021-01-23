import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';
import { ExpandIcon } from '../icons';
import useTheme from '../theme/useTheme';

const SubItemsDiv = styled.div`
  margin-left: 28px;
`;

const ExpandIconHolder2 = styled.span`
  margin-right: 3px;
  // position: relative;
  // top: -3px;
`;

const ExpandIconHolder = styled.span`
  margin-right: 5px;
`;

const GroupDiv = styled.div`
  user-select: none;
  padding: 5px;
  &:hover {
    background-color: ${props => props.theme.left_background_blue[1]};
  }
  cursor: pointer;
  white-space: nowrap;
  font-weight: bold;
`;

function AppObjectListItem({
  AppObjectComponent,
  data,
  filter,
  onObjectClick,
  isExpandable,
  SubItems,
  getCommonProps,
  expandOnClick,
  ExpandIconComponent,
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const expandable = data && isExpandable && isExpandable(data);

  React.useEffect(() => {
    if (!expandable) {
      setIsExpanded(false);
    }
  }, [expandable]);

  let commonProps = {
    prefix: SubItems ? (
      <ExpandIconHolder2>
        {expandable ? (
          <ExpandIconComponent
            isExpanded={isExpanded}
            onClick={e => {
              setIsExpanded(v => !v);
              e.stopPropagation();
            }}
          />
        ) : (
          <ExpandIconComponent isBlank />
        )}
      </ExpandIconHolder2>
    ) : null,
  };

  if (SubItems && expandOnClick) {
    commonProps.onClick2 = () => setIsExpanded(v => !v);
  }
  if (onObjectClick) {
    commonProps.onClick3 = onObjectClick;
  }

  if (getCommonProps) {
    commonProps = { ...commonProps, ...getCommonProps(data) };
  }

  let res = <AppObjectComponent data={data} commonProps={commonProps} />;
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
  const theme = useTheme();
  return (
    <>
      <GroupDiv onClick={() => setIsExpanded(!isExpanded)} theme={theme}>
        <ExpandIconHolder>
          <ExpandIcon isExpanded={isExpanded} />
        </ExpandIconHolder>
        {group} {items && `(${items.filter(x => x.component).length})`}
      </GroupDiv>
      {isExpanded && items.map(x => x.component)}
    </>
  );
}

export function AppObjectList({
  list,
  AppObjectComponent,
  SubItems = undefined,
  onObjectClick = undefined,
  filter = undefined,
  groupFunc = undefined,
  groupOrdered = undefined,
  isExpandable = undefined,
  getCommonProps = undefined,
  expandOnClick = false,
  ExpandIconComponent = ExpandIcon,
}) {
  const createComponent = data => (
    <AppObjectListItem
      key={AppObjectComponent.extractKey(data)}
      AppObjectComponent={AppObjectComponent}
      data={data}
      filter={filter}
      onObjectClick={onObjectClick}
      SubItems={SubItems}
      isExpandable={isExpandable}
      getCommonProps={getCommonProps}
      expandOnClick={expandOnClick}
      ExpandIconComponent={ExpandIconComponent}
    />
  );

  if (groupFunc) {
    const listGrouped = _.compact(
      (list || []).map(data => {
        const matcher = AppObjectComponent.createMatcher && AppObjectComponent.createMatcher(data);
        if (matcher && !matcher(filter)) return null;
        const component = createComponent(data);
        const group = groupFunc(data);
        return { group, data, component };
      })
    );
    const groups = _.groupBy(listGrouped, 'group');
    return (groupOrdered || _.keys(groups)).map(group => (
      <AppObjectGroup key={group} group={group} items={groups[group]} />
    ));
  }

  return (list || []).map(data => {
    const matcher = AppObjectComponent.createMatcher && AppObjectComponent.createMatcher(data);
    if (matcher && !matcher(filter)) return null;
    return createComponent(data);
  });
}
