import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';
import theme from '../theme';

const TabItem = styled.div`
  border-right: 1px solid white;
  padding-left: 15px;
  padding-right: 15px;
  display: flex;
  align-items: center;
  cursor: pointer;
  &:hover {
    color: ${theme.tabsPanel.hoverFont};
  }
  background-color: ${(props) =>
    // @ts-ignore
    props.selected ? theme.mainArea.background : 'inherit'};
`;

const TabNameWrapper = styled.span`
  margin-left: 5px;
`;

const TabContainer = styled.div``;

const TabsContainer = styled.div`
  display: flex;
  height: ${theme.tabsPanel.height}px;
  right: 0;
  background-color: ${theme.tabsPanel.background};
`;

export function TabPage({ label = undefined, children }) {
  return children;
}

export function TabControl({ children }) {
  const [value, setValue] = React.useState(0);
  const childrenArray = (_.isArray(children) ? _.flatten(children) : [children]).filter((x) => x);
  return (
    <div>
      <TabsContainer>
        {childrenArray
          .filter((x) => x.props)
          .map((tab, index) => (
            // @ts-ignore
            <TabItem key={index} onClick={() => setValue(index)} selected={value == index}>
              <TabNameWrapper>{tab.props.label}</TabNameWrapper>
            </TabItem>
          ))}
      </TabsContainer>
      {<TabContainer key={value}>{childrenArray[value] && childrenArray[value].props.children}</TabContainer>}
    </div>
  );
}
