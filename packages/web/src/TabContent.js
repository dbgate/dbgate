import React from 'react';
import styled from 'styled-components';
import theme from './theme';
import tabs from './tabs';

import { useOpenedTabs } from './utility/globalState';

export default function TabContent() {
  const files = useOpenedTabs();

  const selectedTab = files.find(x => x.selected);
  if (!selectedTab) return null;

  const TabComponent = tabs[selectedTab.tabComponent];
  if (TabComponent) return <TabComponent {...selectedTab.props} />;

  return null;
}
