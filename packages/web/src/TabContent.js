import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';
import tabs from './tabs';
import { useOpenedTabs } from './utility/globalState';
import ErrorBoundary from './utility/ErrorBoundary';

const TabContainerStyled = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  visibility: ${props =>
    // @ts-ignore
    props.tabVisible ? 'visible' : 'hidden'};
`;

function TabContainer({ TabComponent, ...props }) {
  const { tabVisible, tabid, toolbarPortalRef, statusbarPortalRef } = props;
  return (
    // @ts-ignore
    <TabContainerStyled tabVisible={tabVisible}>
      <ErrorBoundary>
        <TabComponent
          {...props}
          tabid={tabid}
          tabVisible={tabVisible}
          toolbarPortalRef={toolbarPortalRef}
          statusbarPortalRef={statusbarPortalRef}
        />
      </ErrorBoundary>
    </TabContainerStyled>
  );
}

const TabContainerMemo = React.memo(TabContainer);

function createTabComponent(selectedTab) {
  const TabComponent = tabs[selectedTab.tabComponent];
  if (TabComponent) {
    return {
      TabComponent,
      props: selectedTab.props,
    };
  }
  return null;
}

export default function TabContent({ toolbarPortalRef, statusbarPortalRef }) {
  const files = useOpenedTabs();

  const [mountedTabs, setMountedTabs] = React.useState({});

  const selectedTab = files.find(x => x.selected && x.closedTime == null);

  React.useEffect(() => {
    // cleanup closed tabs

    if (
      _.difference(
        _.keys(mountedTabs),
        _.map(
          files.filter(x => x.closedTime == null),
          'tabid'
        )
      ).length > 0
    ) {
      setMountedTabs(_.pickBy(mountedTabs, (v, k) => files.find(x => x.tabid == k && x.closedTime == null)));
    }

    if (selectedTab) {
      const { tabid } = selectedTab;
      if (tabid && !mountedTabs[tabid])
        setMountedTabs({
          ...mountedTabs,
          [tabid]: createTabComponent(selectedTab),
        });
    }
  }, [mountedTabs, files]);

  return _.keys(mountedTabs).map(tabid => {
    const { TabComponent, props } = mountedTabs[tabid];
    const tabVisible = tabid == (selectedTab && selectedTab.tabid);
    return (
      <TabContainerMemo
        key={tabid}
        {...props}
        tabid={tabid}
        tabVisible={tabVisible}
        toolbarPortalRef={toolbarPortalRef}
        statusbarPortalRef={statusbarPortalRef}
        TabComponent={TabComponent}
      />
    );
  });
}
